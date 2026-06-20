import { kkiapay } from '@kkiapay-org/nodejs-sdk';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type {
  CustomerNotification,
  CustomerOrder,
  CustomerPaymentStatus,
  OrderPayment,
} from '@/types/customerOrders';
import { sendOrderPaymentReceipt } from './receiptMailer';

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

type KkiapayServerConfig = {
  publicKey: string;
  privateKey: string;
  secretKey: string;
  sandbox: boolean;
};

type KkiapayVerification = {
  success: boolean;
  amount: number | null;
  providerStatus: string | null;
  transactionId: string;
  partnerId: string | null;
  method: string | null;
  account: string | null;
  raw: unknown;
};

export class PaymentFlowError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PaymentFlowError';
    this.status = status;
  }
}

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toNullableString = (value: unknown) => {
  const cleaned = toCleanString(value);
  return cleaned.length > 0 ? cleaned : null;
};

const toOptionalNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNested = (value: unknown, path: string): unknown => {
  if (!isRecord(value)) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[key];
  }, value);
};

const getKkiapayServerConfig = (): KkiapayServerConfig => {
  const publicKey = (
    process.env.KKIAPAY_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_KKIAPAY_KEY ||
    ''
  ).trim();
  const privateKey = (process.env.KKIAPAY_PRIVATE_KEY || '').trim();
  const secretKey = (process.env.KKIAPAY_SECRET_KEY || '').trim();
  const sandbox =
    process.env.KKIAPAY_SANDBOX === 'true' || process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX === 'true';

  if (!publicKey || !privateKey || !secretKey) {
    throw new PaymentFlowError(
      'Configuration Kkiapay incomplete. Ajoutez KKIAPAY_PRIVATE_KEY et KKIAPAY_SECRET_KEY cote serveur.',
      503
    );
  }

  return { publicKey, privateKey, secretKey, sandbox };
};

const getKkiapayClient = (config: KkiapayServerConfig) =>
  kkiapay({
    publickey: config.publicKey,
    privatekey: config.privateKey,
    secretkey: config.secretKey,
    sandbox: config.sandbox,
  });

const normalizeOrder = (id: string, data: DocumentData): CustomerOrder => ({
  ...(data as CustomerOrder),
  id,
});

const normalizePayment = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
  receiptEmail: toNullableString(data.receiptEmail),
  receiptStatus: data.receiptStatus || 'not_requested',
  receiptSentAt: data.receiptSentAt ?? null,
  receiptError: toNullableString(data.receiptError),
});

const buildProviderReference = (orderId: string, paymentId: string) =>
  `AFP-ORDER-${orderId.slice(-8).toUpperCase()}-${paymentId.slice(-8).toUpperCase()}`;

const assertValidOrderId = (orderId: string) => {
  if (!ORDER_ID_PATTERN.test(orderId)) {
    throw new PaymentFlowError('Commande invalide.', 400);
  }
};

const assertValidPaymentId = (paymentId: string) => {
  if (!PAYMENT_ID_PATTERN.test(paymentId)) {
    throw new PaymentFlowError('Paiement invalide.', 400);
  }
};

const normalizeVerification = (transactionId: string, raw: unknown): KkiapayVerification => {
  const providerStatus = toNullableString(
    readNested(raw, 'status') ||
      readNested(raw, 'state') ||
      readNested(raw, 'transaction.status') ||
      readNested(raw, 'data.status')
  );
  const statusUpper = (providerStatus || '').toUpperCase();
  const successFlag =
    readNested(raw, 'isPaymentSucces') ||
    readNested(raw, 'isPaymentSuccess') ||
    readNested(raw, 'success') ||
    readNested(raw, 'data.isPaymentSucces');
  const success =
    successFlag === true ||
    ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'PAYMENT_SUCCESS'].includes(statusUpper);

  return {
    success,
    amount: toOptionalNumber(
      readNested(raw, 'amount') || readNested(raw, 'transaction.amount') || readNested(raw, 'data.amount')
    ),
    providerStatus,
    transactionId,
    partnerId: toNullableString(
      readNested(raw, 'partnerId') ||
        readNested(raw, 'partner_id') ||
        readNested(raw, 'data.partnerId') ||
        readNested(raw, 'transaction.partnerId')
    ),
    method: toNullableString(readNested(raw, 'method') || readNested(raw, 'data.method')),
    account: toNullableString(readNested(raw, 'account') || readNested(raw, 'data.account')),
    raw,
  };
};

const createCustomerNotification = (
  order: CustomerOrder,
  type: CustomerNotification['type'],
  title: string,
  message: string
) => {
  if (!order.userId) {
    return null;
  }

  const notificationRef = getAdminDb().collection('customerNotifications').doc();
  const notification: CustomerNotification = {
    id: notificationRef.id,
    userId: order.userId,
    orderId: order.id,
    type,
    title,
    message,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  return { notificationRef, notification };
};

const validateOrderForPayment = (order: CustomerOrder, userId: string) => {
  if (order.userId !== userId) {
    throw new PaymentFlowError('Cette commande ne correspond pas au compte connecte.', 403);
  }

  if (order.paymentMode !== 'kkiapay_now') {
    throw new PaymentFlowError('Cette commande ne demande pas un paiement Kkiapay direct.', 409);
  }

  if (order.paymentStatus === 'succeeded' || order.status === 'paid') {
    throw new PaymentFlowError('Cette commande est deja payee.', 409);
  }

  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw new PaymentFlowError('Cette commande ne peut plus etre payee en ligne.', 409);
  }

  const amount = Number(order.totals.totalDue || order.totals.itemsSubtotal || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentFlowError('Montant de commande invalide.', 409);
  }

  if (!order.customer.email) {
    throw new PaymentFlowError('Adresse email requise pour envoyer le recu de paiement.', 409);
  }

  return Math.round(amount);
};

export const initiateKkiapayOrderPayment = async (params: { orderId: string; userId: string }) => {
  assertValidOrderId(params.orderId);
  const config = getKkiapayServerConfig();
  const adminDb = getAdminDb();
  const orderRef = adminDb.collection('orders').doc(params.orderId);
  const paymentRef = adminDb.collection('orderPayments').doc();
  const providerReference = buildProviderReference(params.orderId, paymentRef.id);

  const result = await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new PaymentFlowError('Commande introuvable.', 404);
    }

    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});
    const amount = validateOrderForPayment(order, params.userId);
    const now = FieldValue.serverTimestamp();
    const payment: OrderPayment = {
      id: paymentRef.id,
      orderId: order.id,
      userId: params.userId,
      provider: 'kkiapay',
      status: 'provider_opened',
      amount,
      currency: 'XOF',
      providerIntentId: providerReference,
      providerTransactionId: null,
      providerReference,
      failureReason: null,
      receiptEmail: order.customer.email,
      receiptStatus: 'not_requested',
      receiptSentAt: null,
      receiptError: null,
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
    };

    transaction.set(paymentRef, {
      ...payment,
      channel: 'product_direct_purchase',
      orderReference: order.localDraftId || order.id,
      customerName: order.customer.fullName,
      customerWhatsapp: order.customer.whatsapp,
    });
    transaction.update(orderRef, {
      status: 'payment_pending',
      paymentStatus: 'provider_opened' satisfies CustomerPaymentStatus,
      updatedAt: now,
    });

    const notification = createCustomerNotification(
      order,
      'payment_required',
      'Paiement ouvert',
      'La fenetre Kkiapay a ete ouverte pour votre commande.'
    );
    if (notification) {
      transaction.set(notification.notificationRef, notification.notification);
    }

    return {
      payment,
      order,
    };
  });

  return {
    paymentId: result.payment.id,
    providerReference: result.payment.providerReference,
    amount: result.payment.amount,
    currency: result.payment.currency,
    publicKey: config.publicKey,
    sandbox: config.sandbox,
    customer: {
      name: result.order.customer.fullName,
      email: result.order.customer.email,
      phone: result.order.customer.whatsapp,
    },
  };
};

const verifyKkiapayTransaction = async (transactionId: string) => {
  const normalizedTransactionId = transactionId.trim();
  if (!normalizedTransactionId) {
    throw new PaymentFlowError('Reference transaction Kkiapay manquante.', 400);
  }

  const config = getKkiapayServerConfig();
  const client = getKkiapayClient(config);
  const raw = await client.verify(normalizedTransactionId);
  return normalizeVerification(normalizedTransactionId, raw);
};

const markPaymentFailed = async (params: {
  orderId: string;
  paymentId: string;
  failureReason: string;
  transactionId?: string | null;
}) => {
  const adminDb = getAdminDb();
  const orderRef = adminDb.collection('orders').doc(params.orderId);
  const paymentRef = adminDb.collection('orderPayments').doc(params.paymentId);

  await adminDb.runTransaction(async transaction => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);

    if (!orderSnapshot.exists || !paymentSnapshot.exists) {
      return;
    }

    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});
    const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data() ?? {});
    if (payment.orderId !== order.id) {
      return;
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(paymentRef, {
      status: 'failed' satisfies CustomerPaymentStatus,
      providerTransactionId: params.transactionId || payment.providerTransactionId || null,
      failureReason: params.failureReason,
      updatedAt: now,
      verifiedAt: now,
    });

    if (order.paymentStatus !== 'succeeded') {
      transaction.update(orderRef, {
        status: 'payment_pending',
        paymentStatus: 'failed' satisfies CustomerPaymentStatus,
        updatedAt: now,
      });
    }

    const notification = createCustomerNotification(
      order,
      'payment_failed',
      'Paiement non confirme',
      'Le paiement Kkiapay de votre commande n a pas abouti.'
    );
    if (notification) {
      transaction.set(notification.notificationRef, notification.notification);
    }
  });
};

export const verifyAndFinalizeKkiapayOrderPayment = async (params: {
  orderId: string;
  paymentId: string;
  transactionId: string;
  userId?: string | null;
}) => {
  assertValidOrderId(params.orderId);
  assertValidPaymentId(params.paymentId);
  const verification = await verifyKkiapayTransaction(params.transactionId);
  const adminDb = getAdminDb();
  const orderRef = adminDb.collection('orders').doc(params.orderId);
  const paymentRef = adminDb.collection('orderPayments').doc(params.paymentId);

  const finalized = await adminDb.runTransaction(async transaction => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);

    if (!orderSnapshot.exists) {
      throw new PaymentFlowError('Commande introuvable.', 404);
    }

    if (!paymentSnapshot.exists) {
      throw new PaymentFlowError('Paiement introuvable.', 404);
    }

    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});
    const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data() ?? {});

    if (payment.orderId !== order.id) {
      throw new PaymentFlowError('Paiement incoherent avec la commande.', 409);
    }

    if (params.userId && payment.userId !== params.userId) {
      throw new PaymentFlowError('Ce paiement ne correspond pas au compte connecte.', 403);
    }

    if (payment.status === 'succeeded' && order.paymentStatus === 'succeeded') {
      return { order, payment };
    }

    if (verification.partnerId && verification.partnerId !== payment.providerReference) {
      throw new PaymentFlowError('Reference Kkiapay incoherente.', 409);
    }

    if (verification.amount !== null && Math.round(verification.amount) !== Math.round(payment.amount)) {
      throw new PaymentFlowError('Montant Kkiapay incoherent avec la commande.', 409);
    }

    if (!verification.success) {
      throw new PaymentFlowError('Paiement Kkiapay non confirme.', 402);
    }

    const now = FieldValue.serverTimestamp();
    const nextPayment: OrderPayment = {
      ...payment,
      status: 'succeeded',
      providerTransactionId: verification.transactionId,
      failureReason: null,
      updatedAt: now,
      verifiedAt: now,
    };
    const nextOrder: CustomerOrder = {
      ...order,
      status: 'paid',
      paymentStatus: 'succeeded',
      updatedAt: now,
    };

    transaction.update(paymentRef, {
      status: nextPayment.status,
      providerTransactionId: nextPayment.providerTransactionId,
      providerStatus: verification.providerStatus,
      providerAmount: verification.amount,
      providerMethod: verification.method,
      providerAccount: verification.account,
      failureReason: null,
      updatedAt: now,
      verifiedAt: now,
    });
    transaction.update(orderRef, {
      status: nextOrder.status,
      paymentStatus: nextOrder.paymentStatus,
      updatedAt: now,
    });

    const notification = createCustomerNotification(
      nextOrder,
      'payment_succeeded',
      'Paiement confirme',
      'Votre paiement Kkiapay est confirme. AfricaPhone prepare la suite.'
    );
    if (notification) {
      transaction.set(notification.notificationRef, notification.notification);
    }

    return { order: nextOrder, payment: nextPayment };
  });

  if (!finalized?.order || !finalized.payment) {
    throw new PaymentFlowError('Paiement non finalise.', 500);
  }

  const finalizedOrder = finalized.order;
  const finalizedPayment = finalized.payment;

  if (finalizedPayment.receiptStatus !== 'sent') {
    const receiptResult = await sendOrderPaymentReceipt({
      order: finalizedOrder,
      payment: finalizedPayment,
      transactionId: verification.transactionId,
    });

    await paymentRef.update({
      receiptStatus: receiptResult.status,
      receiptSentAt: receiptResult.status === 'sent' ? FieldValue.serverTimestamp() : null,
      receiptError: receiptResult.status === 'sent' ? null : receiptResult.error,
      receiptProviderMessageId: receiptResult.status === 'sent' ? receiptResult.messageId : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    order: finalizedOrder,
    payment: finalizedPayment,
    verification: {
      transactionId: verification.transactionId,
      amount: verification.amount,
      providerStatus: verification.providerStatus,
    },
  };
};

export const resolveKkiapayPaymentFromWebhook = async (params: {
  partnerId?: string | null;
  transactionId?: string | null;
}) => {
  const adminDb = getAdminDb();
  const partnerId = toNullableString(params.partnerId);
  const transactionId = toNullableString(params.transactionId);

  if (partnerId) {
    const snapshot = await adminDb
      .collection('orderPayments')
      .where('providerReference', '==', partnerId)
      .limit(1)
      .get();
    const paymentSnapshot = snapshot.docs[0];
    if (paymentSnapshot) {
      const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data());
      return { orderId: payment.orderId, paymentId: payment.id };
    }
  }

  if (transactionId) {
    const snapshot = await adminDb
      .collection('orderPayments')
      .where('providerTransactionId', '==', transactionId)
      .limit(1)
      .get();
    const paymentSnapshot = snapshot.docs[0];
    if (paymentSnapshot) {
      const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data());
      return { orderId: payment.orderId, paymentId: payment.id };
    }
  }

  return null;
};

export const markKkiapayWebhookFailure = async (params: {
  orderId: string;
  paymentId: string;
  transactionId?: string | null;
  failureReason?: string | null;
}) => {
  await markPaymentFailed({
    orderId: params.orderId,
    paymentId: params.paymentId,
    transactionId: params.transactionId,
    failureReason: params.failureReason || 'Paiement signale en echec par Kkiapay.',
  });
};

export const isValidKkiapayWebhookSecret = (secretHeader: string | null) => {
  const expectedSecret = process.env.KKIAPAY_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    return false;
  }

  return secretHeader === expectedSecret;
};
