import { NextResponse, type NextRequest } from 'next/server';
import { type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import type {
  FirestoreTimestampLike,
  InstallmentPlan,
  InstallmentPlanScheduleItem,
  OrderPayment,
} from '@/types/customerOrders';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

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

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour suivre les cotisations.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('installments: invalid client token', error);
    return { ok: false as const, response: errorResponse('Session client invalide ou expiree.', 401) };
  }
};

const normalizeInstallmentSnapshot = (id: string, data: DocumentData): InstallmentPlan => ({
  ...(data as InstallmentPlan),
  id,
});

const normalizePaymentSnapshot = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
});

const serializeScheduleItem = (item: InstallmentPlanScheduleItem): InstallmentPlanScheduleItem & { dueAt: string | null } => ({
  ...item,
  dueAt: toIsoString(item.dueAt),
});

const serializeInstallmentPlan = (plan: InstallmentPlan, fallbackId?: string) => ({
  ...plan,
  id: plan.id || fallbackId || '',
  createdAt: toIsoString(plan.createdAt),
  updatedAt: toIsoString(plan.updatedAt),
  activatedAt: toIsoString(plan.activatedAt),
  lastPaymentAt: toIsoString(plan.lastPaymentAt),
  schedule: Array.isArray(plan.schedule) ? plan.schedule.map(serializeScheduleItem) : [],
});

const serializePayment = (payment: OrderPayment, fallbackId?: string) => ({
  id: payment.id || fallbackId || '',
  orderId: payment.orderId,
  installmentPlanId: payment.installmentPlanId || null,
  channel: payment.channel || 'product_direct_purchase',
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  providerReference: payment.providerReference,
  providerTransactionId: payment.providerTransactionId,
  failureReason: payment.failureReason,
  receiptStatus: payment.receiptStatus,
  receiptError: payment.receiptError,
  createdAt: toIsoString(payment.createdAt),
  updatedAt: toIsoString(payment.updatedAt),
  verifiedAt: toIsoString(payment.verifiedAt),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUserId(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const adminDb = getAdminDb();
    const [plansSnapshot, paymentsSnapshot] = await Promise.all([
      adminDb.collection('installmentPlans').where('userId', '==', authResult.userId).limit(100).get(),
      adminDb.collection('orderPayments').where('userId', '==', authResult.userId).limit(200).get(),
    ]);
    const plans = plansSnapshot.docs
      .map(docSnap => serializeInstallmentPlan(normalizeInstallmentSnapshot(docSnap.id, docSnap.data()), docSnap.id))
      .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
    const planIds = new Set(plans.map(plan => plan.id));
    const payments = paymentsSnapshot.docs
      .map(docSnap => serializePayment(normalizePaymentSnapshot(docSnap.id, docSnap.data()), docSnap.id))
      .filter(payment => payment.channel === 'installment_payment' && payment.installmentPlanId && planIds.has(payment.installmentPlanId))
      .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

    return NextResponse.json({
      installments: plans,
      payments,
    });
  } catch (error) {
    console.error('installments: list failed', error);
    return errorResponse('Impossible de charger les cotisations.', 500);
  }
}
