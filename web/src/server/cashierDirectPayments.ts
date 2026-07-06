import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { CustomerOrder, FirestoreTimestampLike, OrderPayment } from '@/types/customerOrders';

const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export class CashierPaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CashierPaymentError';
    this.status = status;
  }
}

const normalizeOrder = (id: string, data: DocumentData): CustomerOrder => ({
  ...(data as CustomerOrder),
  id,
});

const normalizePayment = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
});

const toIsoString = (value: FirestoreTimestampLike): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return Number.isNaN(date.valueOf()) ? null : date.toISOString();
    }

    const seconds = typeof timestamp.seconds === 'number' ? timestamp.seconds : timestamp._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }

  return null;
};

const isDirectSucceededPayment = (payment: OrderPayment) =>
  (payment.channel || 'product_direct_purchase') === 'product_direct_purchase' &&
  payment.provider === 'kkiapay' &&
  payment.status === 'succeeded';

const serializeCashierSync = (payment: OrderPayment) => ({
  status: payment.cashierSync?.status || 'pending',
  acknowledgedAt: toIsoString(payment.cashierSync?.acknowledgedAt ?? null),
  acknowledgedBy: payment.cashierSync?.acknowledgedBy ?? null,
  externalReference: payment.cashierSync?.externalReference ?? null,
  note: payment.cashierSync?.note ?? null,
});

const serializeCashierPayment = (payment: OrderPayment, order: CustomerOrder | null) => ({
  id: payment.id,
  orderId: payment.orderId,
  orderReference: payment.orderReference || order?.localDraftId || payment.orderId,
  channel: payment.channel || 'product_direct_purchase',
  provider: payment.provider,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  providerReference: payment.providerReference,
  providerTransactionId: payment.providerTransactionId,
  verifiedAt: toIsoString(payment.verifiedAt),
  createdAt: toIsoString(payment.createdAt),
  updatedAt: toIsoString(payment.updatedAt),
  customer: {
    name: payment.customerName || order?.customer.fullName || null,
    whatsapp: payment.customerWhatsapp || order?.customer.whatsapp || null,
    email: order?.customer.email || payment.receiptEmail || null,
  },
  fulfillment: order
    ? {
        mode: order.fulfillmentMode,
        delivery: order.delivery,
        representative: order.representative,
      }
    : null,
  items: order?.items ?? [],
  totals: order?.totals ?? {
    itemsSubtotal: payment.amount,
    deliveryFee: null,
    discountTotal: 0,
    totalDue: payment.amount,
    currency: payment.currency,
  },
  cashierSync: serializeCashierSync(payment),
});

export const listDirectCashierPayments = async (params: {
  limit: number;
  sinceIso?: string | null;
  onlyUnacknowledged?: boolean;
}) => {
  const adminDb = getAdminDb();
  const fetchLimit = Math.max(50, Math.min(500, params.limit * 5));
  const sinceTime = params.sinceIso ? Date.parse(params.sinceIso) : Number.NaN;
  const snapshot = await adminDb.collection('orderPayments').orderBy('createdAt', 'desc').limit(fetchLimit).get();
  const payments = snapshot.docs
    .map(docSnap => normalizePayment(docSnap.id, docSnap.data()))
    .filter(isDirectSucceededPayment)
    .filter(payment => {
      if (!params.onlyUnacknowledged) {
        return true;
      }

      return payment.cashierSync?.status !== 'acknowledged';
    })
    .filter(payment => {
      if (!Number.isFinite(sinceTime)) {
        return true;
      }

      const paymentIso = toIsoString(payment.verifiedAt || payment.createdAt);
      return paymentIso ? Date.parse(paymentIso) >= sinceTime : false;
    })
    .slice(0, params.limit);

  const orderRefs = payments.map(payment => adminDb.collection('orders').doc(payment.orderId));
  const orderSnapshots = orderRefs.length > 0 ? await adminDb.getAll(...orderRefs) : [];
  const orders = new Map(
    orderSnapshots
      .filter(snapshot => snapshot.exists)
      .map(snapshot => [snapshot.id, normalizeOrder(snapshot.id, snapshot.data() ?? {})])
  );

  return payments.map(payment => serializeCashierPayment(payment, orders.get(payment.orderId) ?? null));
};

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const acknowledgeDirectCashierPayment = async (params: {
  paymentId: string;
  cashierId?: string | null;
  externalReference?: string | null;
  note?: string | null;
}) => {
  if (!PAYMENT_ID_PATTERN.test(params.paymentId)) {
    throw new CashierPaymentError('Paiement invalide.', 400);
  }

  const adminDb = getAdminDb();
  const paymentRef = adminDb.collection('orderPayments').doc(params.paymentId);
  const eventRef = adminDb.collection('cashierPaymentEvents').doc();
  const cashierId = toCleanString(params.cashierId) || 'cashier-api';
  const externalReference = toCleanString(params.externalReference) || null;
  const note = toCleanString(params.note) || null;
  const acknowledgedAtResponse = new Date();

  const result = await adminDb.runTransaction(async transaction => {
    const paymentSnapshot = await transaction.get(paymentRef);
    if (!paymentSnapshot.exists) {
      throw new CashierPaymentError('Paiement introuvable.', 404);
    }

    const payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data() ?? {});
    if (!isDirectSucceededPayment(payment)) {
      throw new CashierPaymentError('Seuls les achats directs Kkiapay confirmes sont acceptes par cette API.', 409);
    }

    const now = FieldValue.serverTimestamp();
    const cashierSync = {
      status: 'acknowledged' as const,
      acknowledgedAt: now,
      acknowledgedBy: cashierId,
      externalReference,
      note,
    };

    transaction.update(paymentRef, {
      cashierSync,
      cashierAcknowledgedAt: now,
      cashierAcknowledgedBy: cashierId,
      cashierExternalReference: externalReference,
      updatedAt: now,
    });
    transaction.set(eventRef, {
      id: eventRef.id,
      type: 'cashier_payment_acknowledged',
      paymentId: payment.id,
      orderId: payment.orderId,
      cashierId,
      externalReference,
      note,
      createdAt: now,
    });

    return {
      ...payment,
      cashierSync: {
        ...cashierSync,
        acknowledgedAt: acknowledgedAtResponse,
      },
    };
  });

  return serializeCashierPayment(result, null);
};
