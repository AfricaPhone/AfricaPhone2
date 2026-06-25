import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { initiateKkiapayInstallmentPayment } from '@/server/kkiapayInstallmentPayments';
import { PaymentFlowError } from '@/server/kkiapayOrderPayments';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour cotiser.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('installment kkiapay initiate: invalid client token', error);
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
  const installmentPlanId = typeof body.installmentPlanId === 'string' ? body.installmentPlanId.trim() : '';
  const amount = Math.round(Number(body.amount || 0));

  try {
    const payment = await initiateKkiapayInstallmentPayment({
      installmentPlanId,
      amount,
      userId: authResult.userId,
    });

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return errorResponse(error.message, error.status);
    }

    console.error('installment kkiapay initiate: failed', error);
    return errorResponse('Impossible de preparer la cotisation Kkiapay.', 500);
  }
}
