import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { serializeCustomerOrderForClient } from '@/server/customerOrders';
import type {
  CustomerOrder,
  CustomerOrderClientView,
  CustomerOrderStatus,
  CustomerPaymentStatus,
} from '@/types/customerOrders';

const ORDER_STATUSES = new Set<CustomerOrderStatus>([
  'draft',
  'pending_review',
  'profile_required',
  'payment_pending',
  'paid',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
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

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const normalizeOrderSnapshot = (id: string, data: DocumentData): CustomerOrder => ({
  ...(data as CustomerOrder),
  id,
});

const sortOrdersForAdmin = (orders: CustomerOrderClientView[]) =>
  [...orders].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

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

    return { ok: true as const, uid: decodedToken.uid };
  } catch (error) {
    console.error('admin orders: invalid token', error);
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
    const snapshot = await getAdminDb().collection('orders').orderBy('createdAt', 'desc').limit(100).get();
    const orders = snapshot.docs.map(docSnap =>
      serializeCustomerOrderForClient(normalizeOrderSnapshot(docSnap.id, docSnap.data()), docSnap.id)
    );

    return NextResponse.json({ orders: sortOrdersForAdmin(orders) });
  } catch (error) {
    console.error('admin orders: list failed', error);
    return errorResponse('Impossible de charger les commandes admin.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Requete invalide.', 400);
  }

  if (!payload || typeof payload !== 'object') {
    return errorResponse('Requete invalide.', 400);
  }

  const body = payload as {
    orderId?: unknown;
    status?: unknown;
    paymentStatus?: unknown;
  };
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';

  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(orderId)) {
    return errorResponse('Commande invalide.', 400);
  }

  const updates: Partial<Pick<CustomerOrder, 'status' | 'paymentStatus'>> & {
    updatedAt: FieldValue;
    updatedBy: string;
  } = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminResult.uid,
  };

  if (typeof body.status === 'string') {
    if (!ORDER_STATUSES.has(body.status as CustomerOrderStatus)) {
      return errorResponse('Statut commande invalide.', 400);
    }
    updates.status = body.status as CustomerOrderStatus;
  }

  if (typeof body.paymentStatus === 'string') {
    if (!PAYMENT_STATUSES.has(body.paymentStatus as CustomerPaymentStatus)) {
      return errorResponse('Statut paiement invalide.', 400);
    }
    updates.paymentStatus = body.paymentStatus as CustomerPaymentStatus;
  }

  if (!updates.status && !updates.paymentStatus) {
    return errorResponse('Aucune modification fournie.', 400);
  }

  try {
    const orderRef = getAdminDb().collection('orders').doc(orderId);
    await orderRef.update(updates);
    const updatedSnapshot = await orderRef.get();

    if (!updatedSnapshot.exists) {
      return errorResponse('Commande introuvable.', 404);
    }

    return NextResponse.json({
      order: serializeCustomerOrderForClient(
        normalizeOrderSnapshot(updatedSnapshot.id, updatedSnapshot.data() ?? {}),
        updatedSnapshot.id
      ),
    });
  } catch (error) {
    console.error('admin orders: update failed', error);
    return errorResponse('Impossible de mettre a jour la commande.', 500);
  }
}
