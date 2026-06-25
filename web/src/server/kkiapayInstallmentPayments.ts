import { kkiapay } from '@kkiapay-org/nodejs-sdk';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type {
  CustomerNotification,
  CustomerOrder,
  CustomerPaymentStatus,
  InstallmentPlan,
  OrderPayment,
} from '@/types/customerOrders';
import { PaymentFlowError } from './kkiapayOrderPayments';
import { sendOrderPaymentReceipt } from './receiptMailer';

const INSTALLMENT_PLAN_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const MIN_INSTALLMENT_AMOUNT = 500;

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
    process.env.KKIA_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_KKIAPAY_KEY ||
    ''
  ).trim();
  const privateKey = (process.env.KKIAPAY_PRIVATE_KEY || process.env.KKIA_PRIVATE_KEY || '').trim();
  const secretKey = (process.env.KKIAPAY_SECRET_KEY || process.env.KKIA_SECRET_KEY || '').trim();
  const sandbox =
    process.env.KKIAPAY_SANDBOX === 'true' ||
    process.env.KKIA_SANDBOX === 'true' ||
    process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX === 'true';

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

const normalizePlan = (id: string, data: DocumentData): InstallmentPlan => ({
  ...(data as InstallmentPlan),
  id,
});

const normalizePayment = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
  installmentPlanId: toNullableString(data.installmentPlanId),
  receiptEmail: toNullableString(data.receiptEmail),
  receiptStatus: data.receiptStatus || 'not_requested',
  receiptSentAt: data.receiptSentAt ?? null,
  receiptError: toNullableString(data.receiptError),
});

const buildProviderReference = (installmentPlanId: string, paymentId: string) =>
  `AFP-COT-${installmentPlanId.slice(-8).toUpperCase()}-${paymentId.slice(-8).toUpperCase()}`;

const assertValidInstallmentPlanId = (installmentPlanId: string) => {
  if (!INSTALLMENT_PLAN_ID_PATTERN.test(installmentPlanId)) {
    throw new PaymentFlowError('Dossier cotisation invalide.', 400);
  }
};

const assertValidPaymentId = (paymentId: string) => {
  if (!PAYMENT_ID_PATTERN.test(paymentId)) {
    throw new PaymentFlowError('Paiement invalide.', 400);
  }
};

const normalizeAmount = (amount: unknown) => {
  const normalized = Math.round(Number(amount || 0));
  if (!Number.isFinite(normalized) || normalized < MIN_INSTALLMENT_AMOUNT) {
    throw new PaymentFlowError(`Le montant minimum de cotisation est ${MIN_INSTALLMENT_AMOUNT} FCFA.`, 400);
  }

  return normalized;
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

const validatePlanForPayment = (plan: InstallmentPlan, userId: string, amount: number) => {
  if (plan.userId !== userId) {
    throw new PaymentFlowError('Ce dossier cotisation ne correspond pas au compte connecte.', 403);
  }

  if (!['active', 'late'].includes(plan.status)) {
    throw new PaymentFlowError('Le contrat doit etre valide par AfricaPhone avant les cotisations.', 409);
  }

  const balanceRemaining = Math.max(0, Math.round(Number(plan.balanceRemaining || 0)));
  if (balanceRemaining <= 0 || plan.status === 'completed') {
    throw new PaymentFlowError('Cette cotisation est deja soldee.', 409);
  }

  if (amount > balanceRemaining) {
    throw new PaymentFlowError('Le montant depasse le solde restant du dossier.', 409);
  }

  if (!plan.customer.email) {
    throw new PaymentFlowError('Adresse email requise pour envoyer le recu de cotisation.', 409);
  }
};

export const initiateKkiapayInstallmentPayment = async (params: {
  installmentPlanId: string;
  amount: number;
  userId: string;
}) => {
  assertValidInstallmentPlanId(params.installmentPlanId);
  const amount = normalizeAmount(params.amount);
  const config = getKkiapayServerConfig();
  const adminDb = getAdminDb();
  const planRef = adminDb.collection('installmentPlans').doc(params.installmentPlanId);
  const paymentRef = adminDb.collection('orderPayments').doc();
  const providerReference = buildProviderReference(params.installmentPlanId, paymentRef.id);

  const result = await adminDb.runTransaction(async transaction => {
    const planSnapshot = await transaction.get(planRef);
    if (!planSnapshot.exists) {
      throw new PaymentFlowError('Dossier cotisation introuvable.', 404);
    }

    const plan = normalizePlan(planSnapshot.id, planSnapshot.data() ?? {});
    validatePlanForPayment(plan, params.userId, amount);

    const orderRef = adminDb.collection('orders').doc(plan.orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new PaymentFlowError('Commande cotisation introuvable.', 404);
    }
    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});

    const now = FieldValue.serverTimestamp();
    const payment: OrderPayment = {
      id: paymentRef.id,
      orderId: plan.orderId,
      userId: params.userId,
      provider: 'kkiapay',
      channel: 'installment_payment',
      installmentPlanId: plan.id,
      status: 'provider_opened',
      amount,
      currency: 'XOF',
      providerIntentId: providerReference,
      providerTransactionId: null,
      providerReference,
      failureReason: null,
      receiptEmail: plan.customer.email,
      receiptStatus: 'not_requested',
      receiptSentAt: null,
      receiptError: null,
      orderReference: plan.orderReference || plan.orderId,
      customerName: plan.customer.fullName,
      customerWhatsapp: plan.customer.whatsapp,
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
    };

    transaction.set(paymentRef, payment);
    transaction.update(planRef, {
      lastPaymentId: paymentRef.id,
      updatedAt: now,
    });

    const notification = createCustomerNotification(
      order,
      'payment_required',
      'Cotisation ouverte',
      'La fenetre Kkiapay a ete ouverte pour votre versement de cotisation.'
    );
    if (notification) {
      transaction.set(notification.notificationRef, notification.notification);
    }

    return { plan, payment };
  });

  return {
    paymentId: result.payment.id,
    installmentPlanId: result.plan.id,
    providerReference: result.payment.providerReference,
    amount: result.payment.amount,
    currency: result.payment.currency,
    publicKey: config.publicKey,
    sandbox: config.sandbox,
    customer: {
      name: result.plan.customer.fullName,
      email: result.plan.customer.email,
      phone: result.plan.customer.whatsapp,
    },
  };
};

const markInstallmentPaymentFailed = async (params: {
  paymentId: string;
  transactionId?: string | null;
  failureReason: string;
}) => {
  assertValidPaymentId(params.paymentId);
  const adminDb = getAdminDb();
  const paymentRef = adminDb.collection('orderPayments').doc(params.paymentId);

  await paymentRef.update({
    status: 'failed' satisfies CustomerPaymentStatus,
    providerTransactionId: params.transactionId || null,
    failureReason: params.failureReason,
    updatedAt: FieldValue.serverTimestamp(),
    verifiedAt: FieldValue.serverTimestamp(),
  });
};

export const verifyAndFinalizeKkiapayInstallmentPayment = async (params: {
  installmentPlanId: string;
  paymentId: string;
  transactionId: string;
  userId?: string | null;
}) => {
  assertValidInstallmentPlanId(params.installmentPlanId);
  assertValidPaymentId(params.paymentId);
  const verification = await verifyKkiapayTransaction(params.transactionId);
  const adminDb = getAdminDb();
  const planRef = adminDb.collection('installmentPlans').doc(params.installmentPlanId);
  const paymentRef = adminDb.collection('orderPayments').doc(params.paymentId);

  const finalized = await adminDb.runTransaction(async transaction => {
    const [planSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(planRef),
      transaction.get(paymentRef),
    ]);

    if (!planSnapshot.exists) {
      throw new PaymentFlowError('Dossier cotisation introuvable.', 404);
    }

    if (!paymentSnapshot.exists) {
      throw new PaymentFlowError('Paiement cotisation introuvable.', 404);
    }

    const plan = normalizePlan(planSnapshot.id, planSnapshot.data() ?? {});
    const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data() ?? {});
    if (payment.channel !== 'installment_payment' || payment.installmentPlanId !== plan.id) {
      throw new PaymentFlowError('Paiement incoherent avec la cotisation.', 409);
    }

    if (params.userId && payment.userId !== params.userId) {
      throw new PaymentFlowError('Ce paiement ne correspond pas au compte connecte.', 403);
    }

    if (payment.status === 'succeeded') {
      return { plan, payment };
    }

    if (verification.partnerId && verification.partnerId !== payment.providerReference) {
      throw new PaymentFlowError('Reference Kkiapay incoherente.', 409);
    }

    if (verification.amount !== null && Math.round(verification.amount) !== Math.round(payment.amount)) {
      throw new PaymentFlowError('Montant Kkiapay incoherent avec la cotisation.', 409);
    }

    if (!verification.success) {
      throw new PaymentFlowError('Paiement Kkiapay non confirme.', 402);
    }

    const orderRef = adminDb.collection('orders').doc(plan.orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new PaymentFlowError('Commande cotisation introuvable.', 404);
    }
    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});

    const previousPaid = Math.max(0, Math.round(Number(plan.amountPaid || 0)));
    const productTotal = Math.max(0, Math.round(Number(plan.productTotal || 0)));
    const nextPaid = previousPaid + Math.round(payment.amount);
    const nextBalance = Math.max(0, productTotal - nextPaid);
    const nextStatus = nextBalance <= 0 ? 'completed' : 'active';
    const now = FieldValue.serverTimestamp();
    const nextPayment: OrderPayment = {
      ...payment,
      status: 'succeeded',
      providerTransactionId: verification.transactionId,
      failureReason: null,
      updatedAt: now,
      verifiedAt: now,
    };
    const nextPlan: InstallmentPlan = {
      ...plan,
      amountPaid: nextPaid,
      balanceRemaining: nextBalance,
      status: nextStatus,
      paymentCount: Number(plan.paymentCount || 0) + 1,
      lastPaymentId: payment.id,
      lastPaymentAt: now,
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
    transaction.update(planRef, {
      amountPaid: nextPaid,
      balanceRemaining: nextBalance,
      status: nextStatus,
      paymentCount: nextPlan.paymentCount,
      lastPaymentId: payment.id,
      lastPaymentAt: now,
      updatedAt: now,
    });

    if (nextBalance <= 0) {
      transaction.update(orderRef, {
        status: 'paid',
        paymentStatus: 'succeeded',
        updatedAt: now,
      });
    }

    const notification = createCustomerNotification(
      order,
      'payment_succeeded',
      nextBalance <= 0 ? 'Cotisation terminee' : 'Cotisation recue',
      nextBalance <= 0
        ? 'Votre dossier est solde. AfricaPhone prepare la suite.'
        : 'Votre versement Kkiapay a ete confirme et ajoute a votre dossier.'
    );
    if (notification) {
      transaction.set(notification.notificationRef, notification.notification);
    }

    return { plan: nextPlan, payment: nextPayment, order };
  });

  if (!finalized?.plan || !finalized.payment) {
    throw new PaymentFlowError('Cotisation non finalisee.', 500);
  }

  const finalizedPayment = finalized.payment;
  const orderSnapshot = await getAdminDb().collection('orders').doc(finalized.plan.orderId).get();
  const finalizedOrder = orderSnapshot.exists
    ? normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {})
    : finalized.order;

  if (finalizedOrder && finalizedPayment.receiptStatus !== 'sent') {
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
    installmentPlan: finalized.plan,
    payment: finalizedPayment,
    verification: {
      transactionId: verification.transactionId,
      amount: verification.amount,
      providerStatus: verification.providerStatus,
    },
  };
};

export const markKkiapayInstallmentWebhookFailure = async (params: {
  paymentId: string;
  transactionId?: string | null;
  failureReason?: string | null;
}) => {
  await markInstallmentPaymentFailed({
    paymentId: params.paymentId,
    transactionId: params.transactionId,
    failureReason: params.failureReason || 'Paiement cotisation signale en echec par Kkiapay.',
  });
};
