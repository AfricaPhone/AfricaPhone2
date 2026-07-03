import { NextResponse, type NextRequest } from 'next/server';
import { type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import type { FirestoreTimestampLike, OrderPayment } from '@/types/customerOrders';

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

const normalizePaymentSnapshot = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
});

const serializePaymentForAdmin = (payment: OrderPayment, fallbackId?: string) => ({
  ...payment,
  id: payment.id || fallbackId || '',
  createdAt: toIsoString(payment.createdAt),
  updatedAt: toIsoString(payment.updatedAt),
  verifiedAt: toIsoString(payment.verifiedAt),
  receiptSentAt: toIsoString(payment.receiptSentAt),
});

const sortPaymentsForAdmin = (payments: ReturnType<typeof serializePaymentForAdmin>[]) =>
  [...payments].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

const requireAdmin = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Session admin requise.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    if (decodedToken.admin !== true) {
      return { ok: false as const, response: errorResponse('Droits admin requis.', 403) };
    }

    return { ok: true as const };
  } catch (error) {
    console.error('admin payments: invalid token', error);
    return { ok: false as const, response: errorResponse('Session admin invalide ou expiree.', 401) };
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const snapshot = await getAdminDb().collection('orderPayments').orderBy('createdAt', 'desc').limit(200).get();
    const payments = snapshot.docs.map(docSnap =>
      serializePaymentForAdmin(normalizePaymentSnapshot(docSnap.id, docSnap.data()), docSnap.id)
    );

    return NextResponse.json({ payments: sortPaymentsForAdmin(payments) });
  } catch (error) {
    console.error('admin payments: list failed', error);
    return errorResponse('Impossible de charger les paiements admin.', 500);
  }
}
