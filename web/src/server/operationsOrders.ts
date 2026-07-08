import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type {
  CustomerOrder,
  CustomerOrderStatus,
  CustomerPaymentStatus,
  FirestoreTimestampLike,
  OrderPayment,
} from '@/types/customerOrders';

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const ORDER_REFERENCE_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

const OPERATION_ORDER_STATUSES = new Set<CustomerOrderStatus>([
  'pending_review',
  'stock_check_pending',
  'stock_reserved',
  'manual_review_required',
  'commercial_validated',
  'profile_required',
  'payment_pending',
  'paid',
  'cashier_control_pending',
  'release_authorized',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'fulfilled',
  'cancelled',
  'expired',
]);

const PAYMENT_STATUSES = new Set<CustomerPaymentStatus>([
  'not_required',
  'pending',
  'provider_opened',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);

export class OperationsOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'OperationsOrderError';
    this.status = status;
  }
}

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toNullableString = (value: unknown) => {
  const cleaned = toCleanString(value);
  return cleaned.length > 0 ? cleaned : null;
};

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

const buildReleaseDecision = (order: CustomerOrder, payments: OrderPayment[]) => {
  const hasSucceededPayment = payments.some(payment => payment.status === 'succeeded');
  const blockers: string[] = [];

  if (order.status === 'cancelled' || order.status === 'expired') {
    blockers.push('Demande annulee ou expiree.');
  }

  if (order.paymentMode === 'kkiapay_now' && !hasSucceededPayment && order.paymentStatus !== 'succeeded') {
    blockers.push('Paiement Kkiapay non confirme.');
  }

  if (order.paymentMode === 'installment_plan') {
    blockers.push('Cotisation: utiliser le circuit cotisation dedie.');
  }

  if (order.fulfillmentMode === 'representative_pickup' && !order.representative?.fullName) {
    blockers.push('Representant non renseigne.');
  }

  return {
    canRelease:
      blockers.length === 0 &&
      ['cashier_control_pending', 'release_authorized', 'ready_for_pickup', 'out_for_delivery'].includes(order.status),
    blockers,
  };
};

const serializePaymentForOperations = (payment: OrderPayment) => ({
  id: payment.id,
  channel: payment.channel || 'product_direct_purchase',
  provider: payment.provider,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  providerReference: payment.providerReference,
  providerTransactionId: payment.providerTransactionId,
  orderReference: payment.orderReference ?? null,
  receiptStatus: payment.receiptStatus ?? null,
  cashierSync: payment.cashierSync ?? null,
  createdAt: toIsoString(payment.createdAt),
  updatedAt: toIsoString(payment.updatedAt),
  verifiedAt: toIsoString(payment.verifiedAt),
});

const serializeOrderForOperations = (order: CustomerOrder, payments: OrderPayment[]) => {
  const release = buildReleaseDecision(order, payments);

  return {
    id: order.id,
    referenceCode: order.referenceCode || order.localDraftId || order.id,
    status: order.status,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    fulfillmentMode: order.fulfillmentMode,
    customer: order.customer,
    representative: order.representative,
    delivery: order.delivery,
    items: order.items,
    totals: order.totals,
    documentIds: order.documentIds,
    installmentPlanId: order.installmentPlanId,
    payments: payments.map(serializePaymentForOperations),
    release,
    createdAt: toIsoString(order.createdAt),
    updatedAt: toIsoString(order.updatedAt),
  };
};

export const findOperationsOrderByReference = async (reference: string) => {
  const normalizedReference = reference.trim().toUpperCase();
  if (!ORDER_REFERENCE_PATTERN.test(normalizedReference)) {
    throw new OperationsOrderError('Reference demande invalide.', 400);
  }

  const adminDb = getAdminDb();
  let order: CustomerOrder | null = null;

  const byReferenceSnapshot = await adminDb
    .collection('orders')
    .where('referenceCode', '==', normalizedReference)
    .limit(1)
    .get();
  const byReferenceDoc = byReferenceSnapshot.docs[0];
  if (byReferenceDoc) {
    order = normalizeOrder(byReferenceDoc.id, byReferenceDoc.data());
  }

  if (!order && ORDER_ID_PATTERN.test(reference)) {
    const byIdSnapshot = await adminDb.collection('orders').doc(reference).get();
    if (byIdSnapshot.exists) {
      order = normalizeOrder(byIdSnapshot.id, byIdSnapshot.data() ?? {});
    }
  }

  if (!order) {
    throw new OperationsOrderError('Demande introuvable.', 404);
  }

  const paymentsSnapshot = await adminDb
    .collection('orderPayments')
    .where('orderId', '==', order.id)
    .limit(20)
    .get();
  const payments = paymentsSnapshot.docs.map(docSnap => normalizePayment(docSnap.id, docSnap.data()));

  return serializeOrderForOperations(order, payments);
};

export const transitionOperationsOrder = async (params: {
  orderId: string;
  status: CustomerOrderStatus;
  paymentStatus?: CustomerPaymentStatus | null;
  actorRole?: string | null;
  actorId?: string | null;
  externalReference?: string | null;
  note?: string | null;
}) => {
  if (!ORDER_ID_PATTERN.test(params.orderId)) {
    throw new OperationsOrderError('Commande invalide.', 400);
  }

  if (!OPERATION_ORDER_STATUSES.has(params.status)) {
    throw new OperationsOrderError('Statut demande invalide.', 400);
  }

  if (params.paymentStatus && !PAYMENT_STATUSES.has(params.paymentStatus)) {
    throw new OperationsOrderError('Statut paiement invalide.', 400);
  }

  const adminDb = getAdminDb();
  const orderRef = adminDb.collection('orders').doc(params.orderId);
  const eventRef = adminDb.collection('orderOperationEvents').doc();
  const actorRole = toNullableString(params.actorRole) || 'operations-api';
  const actorId = toNullableString(params.actorId) || 'external-operator';
  const externalReference = toNullableString(params.externalReference);
  const note = toNullableString(params.note);

  const result = await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new OperationsOrderError('Demande introuvable.', 404);
    }

    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});
    const now = FieldValue.serverTimestamp();
    const updates: Partial<CustomerOrder> & Record<string, unknown> = {
      status: params.status,
      updatedAt: now,
      operationLastEventId: eventRef.id,
      operationLastActorRole: actorRole,
      operationLastActorId: actorId,
      operationLastExternalReference: externalReference,
      operationLastNote: note,
    };

    if (params.paymentStatus) {
      updates.paymentStatus = params.paymentStatus;
    }

    transaction.update(orderRef, updates);
    transaction.set(eventRef, {
      id: eventRef.id,
      orderId: order.id,
      referenceCode: order.referenceCode || null,
      previousStatus: order.status,
      nextStatus: params.status,
      previousPaymentStatus: order.paymentStatus,
      nextPaymentStatus: params.paymentStatus || order.paymentStatus,
      actorRole,
      actorId,
      externalReference,
      note,
      createdAt: now,
    });

    return {
      ...order,
      status: params.status,
      paymentStatus: params.paymentStatus || order.paymentStatus,
      updatedAt: new Date(),
    };
  });

  const paymentsSnapshot = await adminDb
    .collection('orderPayments')
    .where('orderId', '==', result.id)
    .limit(20)
    .get();
  const payments = paymentsSnapshot.docs.map(docSnap => normalizePayment(docSnap.id, docSnap.data()));

  return serializeOrderForOperations(result, payments);
};
