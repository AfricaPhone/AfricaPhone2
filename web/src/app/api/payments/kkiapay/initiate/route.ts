import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { initiateKkiapayOrderPayment, PaymentFlowError } from '@/server/kkiapayOrderPayments';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour payer en ligne.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('kkiapay initiate: invalid client token', error);
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

  const orderId =
    payload && typeof payload === 'object' && typeof (payload as { orderId?: unknown }).orderId === 'string'
      ? (payload as { orderId: string }).orderId.trim()
      : '';

  try {
    const payment = await initiateKkiapayOrderPayment({
      orderId,
      userId: authResult.userId,
    });

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return errorResponse(error.message, error.status);
    }

    console.error('kkiapay initiate: failed', error);
    return errorResponse('Impossible de preparer le paiement Kkiapay.', 500);
  }
}
