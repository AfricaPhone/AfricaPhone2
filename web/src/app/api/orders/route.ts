import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { buildCustomerOrderFromDraft, validateCreateOrderDraft } from '@/server/customerOrders';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';

  if (!authorization) {
    return { ok: true as const, userId: null };
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, message: 'Session client invalide.' };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('orders: invalid auth token', error);
    return { ok: false as const, message: 'Session client invalide ou expiree.' };
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error('orders: invalid JSON', error);
    return errorResponse('Requete invalide.', 400);
  }

  const validation = validateCreateOrderDraft(payload);
  if (!validation.ok) {
    return errorResponse(validation.message, validation.status);
  }

  try {
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.ok) {
      return errorResponse(authResult.message, 401);
    }

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc();
    const now = FieldValue.serverTimestamp();
    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: orderRef.id,
      now,
      userId: authResult.userId,
    });

    await orderRef.set(order);

    return NextResponse.json(
      {
        orderId: orderRef.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        profileRequired: order.status === 'profile_required',
        authenticated: Boolean(authResult.userId),
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('orders: create failed', error);
    return errorResponse('Impossible de creer la commande pour le moment.', 500);
  }
}
