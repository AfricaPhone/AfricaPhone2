import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import {
  buildCustomerOrderFromDraft,
  buildInitialInstallmentPlanFromOrder,
  serializeCustomerOrderForClient,
  validateCreateOrderDraft,
} from '@/server/customerOrders';
import type { CustomerOrder, CustomerOrderClientView } from '@/types/customerOrders';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });
const MAX_ORDER_LOOKUP_IDS = 30;
const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

const parseCsvParam = (value: string | null) =>
  Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    )
  );

const parseOrderIds = (value: string | null) =>
  parseCsvParam(value)
    .filter(item => ORDER_ID_PATTERN.test(item))
    .slice(0, MAX_ORDER_LOOKUP_IDS);

const sortOrdersForClient = (orders: CustomerOrderClientView[]) =>
  [...orders].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

const normalizeOrderSnapshot = (id: string, data: DocumentData): CustomerOrder => ({
  ...(data as CustomerOrder),
  id,
});

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.ok) {
      return errorResponse(authResult.message, 401);
    }

    const orderIds = parseOrderIds(request.nextUrl.searchParams.get('orderIds'));
    const localDraftIds = new Set(parseCsvParam(request.nextUrl.searchParams.get('localDraftIds')));
    const adminDb = getAdminDb();
    const orders = new Map<string, CustomerOrderClientView>();

    if (authResult.userId) {
      const userOrdersSnapshot = await adminDb
        .collection('orders')
        .where('userId', '==', authResult.userId)
        .limit(100)
        .get();

      userOrdersSnapshot.docs.forEach(snapshot => {
        const order = normalizeOrderSnapshot(snapshot.id, snapshot.data());
        orders.set(snapshot.id, serializeCustomerOrderForClient(order, snapshot.id));
      });
    }

    if (orderIds.length > 0 && (authResult.userId || localDraftIds.size > 0)) {
      const refs = orderIds.map(orderId => adminDb.collection('orders').doc(orderId));
      const snapshots = await adminDb.getAll(...refs);

      snapshots.forEach(snapshot => {
        if (!snapshot.exists) {
          return;
        }

        const order = normalizeOrderSnapshot(snapshot.id, snapshot.data() ?? {});
        const belongsToUser = Boolean(authResult.userId && order.userId === authResult.userId);
        const matchesLocalDraft = Boolean(
          (order.localDraftId && localDraftIds.has(order.localDraftId)) ||
            (order.guestId && localDraftIds.has(order.guestId))
        );

        if (belongsToUser || matchesLocalDraft) {
          orders.set(snapshot.id, serializeCustomerOrderForClient(order, snapshot.id));
        }
      });
    }

    return NextResponse.json({
      authenticated: Boolean(authResult.userId),
      orders: sortOrdersForClient(Array.from(orders.values())),
    });
  } catch (error) {
    console.error('orders: list failed', error);
    return errorResponse('Impossible de charger les commandes pour le moment.', 500);
  }
}

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

    if ((validation.draft.paymentMode === 'kkiapay' || validation.draft.paymentMode === 'cotisation') && !authResult.userId) {
      return errorResponse('Compte client requis avant paiement en ligne ou cotisation.', 401);
    }

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc();
    const installmentPlanRef =
      validation.draft.paymentMode === 'cotisation' ? adminDb.collection('installmentPlans').doc() : null;
    const now = FieldValue.serverTimestamp();
    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: orderRef.id,
      now,
      userId: authResult.userId,
      installmentPlanId: installmentPlanRef?.id ?? null,
    });
    const installmentPlan = installmentPlanRef
      ? buildInitialInstallmentPlanFromOrder({
          order,
          installmentPlanId: installmentPlanRef.id,
          now,
        })
      : null;

    const batch = adminDb.batch();
    batch.set(orderRef, order);
    if (installmentPlanRef && installmentPlan) {
      batch.set(installmentPlanRef, installmentPlan);
      batch.update(adminDb.collection('customerDocuments').doc(installmentPlan.identityDocumentId), {
        orderId: orderRef.id,
        installmentPlanId: installmentPlan.id,
        updatedAt: now,
      });
      batch.update(adminDb.collection('customerDocuments').doc(installmentPlan.contractDocumentId), {
        orderId: orderRef.id,
        installmentPlanId: installmentPlan.id,
        contractReference: installmentPlan.contractReference ?? null,
        qrVerification: {
          status: 'manual_review',
          extractedReference: null,
          matchedInstallmentPlanId: installmentPlan.id,
          checkedAt: now,
          error: 'Verification QR automatique non executee. Validation admin requise.',
        },
        updatedAt: now,
      });
    }
    await batch.commit();

    return NextResponse.json(
      {
        orderId: orderRef.id,
        installmentPlanId: installmentPlan?.id ?? null,
        referenceCode: order.referenceCode,
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
