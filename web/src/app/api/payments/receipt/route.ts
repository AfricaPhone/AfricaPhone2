import { NextResponse, type NextRequest } from 'next/server';
import { type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import {
  buildPaymentReceiptFileName,
  buildPaymentReceiptHtmlDocument,
} from '@/server/paymentReceiptDocument';
import type { CustomerOrder, OrderPayment } from '@/types/customerOrders';

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const normalizeOrder = (id: string, data: DocumentData): CustomerOrder => ({
  ...(data as CustomerOrder),
  id,
});

const normalizePayment = (id: string, data: DocumentData): OrderPayment => ({
  ...(data as OrderPayment),
  id,
});

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour telecharger le recu.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('payment receipt: invalid client token', error);
    return { ok: false as const, response: errorResponse('Session client invalide ou expiree.', 401) };
  }
};

const findSucceededPaymentByOrderId = async (orderId: string) => {
  const snapshot = await getAdminDb().collection('orderPayments').where('orderId', '==', orderId).limit(20).get();
  const payments = snapshot.docs
    .map(docSnap => normalizePayment(docSnap.id, docSnap.data()))
    .filter(payment => payment.status === 'succeeded' && payment.provider === 'kkiapay');

  return payments.sort((a, b) => {
    const left = String(a.verifiedAt || a.updatedAt || a.createdAt || '');
    const right = String(b.verifiedAt || b.updatedAt || b.createdAt || '');
    return right.localeCompare(left);
  })[0] ?? null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUserId(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const orderId = (request.nextUrl.searchParams.get('orderId') ?? '').trim();
  const paymentId = (request.nextUrl.searchParams.get('paymentId') ?? '').trim();

  if (!orderId && !paymentId) {
    return errorResponse('Commande ou paiement requis pour telecharger le recu.', 400);
  }

  if (orderId && !ORDER_ID_PATTERN.test(orderId)) {
    return errorResponse('Commande invalide.', 400);
  }

  if (paymentId && !PAYMENT_ID_PATTERN.test(paymentId)) {
    return errorResponse('Paiement invalide.', 400);
  }

  try {
    const adminDb = getAdminDb();
    let payment: OrderPayment | null = null;

    if (paymentId) {
      const paymentSnapshot = await adminDb.collection('orderPayments').doc(paymentId).get();
      if (paymentSnapshot.exists) {
        payment = normalizePayment(paymentSnapshot.id, paymentSnapshot.data() ?? {});
      }
    } else if (orderId) {
      payment = await findSucceededPaymentByOrderId(orderId);
    }

    if (!payment) {
      return errorResponse('Aucun paiement confirme trouve pour ce recu.', 404);
    }

    if (payment.userId !== authResult.userId) {
      return errorResponse('Ce paiement ne correspond pas au compte connecte.', 403);
    }

    if (payment.status !== 'succeeded' || payment.provider !== 'kkiapay') {
      return errorResponse('Le recu est disponible seulement apres paiement confirme.', 409);
    }

    const orderSnapshot = await adminDb.collection('orders').doc(payment.orderId).get();
    if (!orderSnapshot.exists) {
      return errorResponse('Commande introuvable pour ce paiement.', 404);
    }

    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data() ?? {});
    if (order.userId !== authResult.userId) {
      return errorResponse('Cette commande ne correspond pas au compte connecte.', 403);
    }

    const html = buildPaymentReceiptHtmlDocument({
      order,
      payment,
      generatedAt: new Date(),
    });
    const fileName = buildPaymentReceiptFileName(order, payment);

    return new NextResponse(html, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('payment receipt: download failed', error);
    return errorResponse('Impossible de generer le recu pour le moment.', 500);
  }
}
