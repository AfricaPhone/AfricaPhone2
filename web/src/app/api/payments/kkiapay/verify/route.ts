import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { serializeCustomerOrderForClient } from '@/server/customerOrders';
import { PaymentFlowError, verifyAndFinalizeKkiapayOrderPayment } from '@/server/kkiapayOrderPayments';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour confirmer le paiement.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('kkiapay verify: invalid client token', error);
    return { ok: false as const, response: errorResponse('Session client invalide ou expiree.', 401) };
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUserId(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Requete invalide.', 400);
  }

  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
  const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';

  try {
    const result = await verifyAndFinalizeKkiapayOrderPayment({
      orderId,
      paymentId,
      transactionId,
      userId: authResult.userId,
    });

    return NextResponse.json({
      order: serializeCustomerOrderForClient(result.order, result.order.id),
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amount,
        providerTransactionId: result.payment.providerTransactionId,
      },
      verification: result.verification,
    });
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return errorResponse(error.message, error.status);
    }

    console.error('kkiapay verify: failed', error);
    return errorResponse('Impossible de verifier le paiement Kkiapay.', 500);
  }
}
