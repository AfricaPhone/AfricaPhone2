import { NextResponse, type NextRequest } from 'next/server';
import { requireCashierApiKey } from '@/server/cashierApiAuth';
import { acknowledgeDirectCashierPayment, CashierPaymentError } from '@/server/cashierDirectPayments';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { paymentId: string } }) {
  const authResult = requireCashierApiKey(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  try {
    const payment = await acknowledgeDirectCashierPayment({
      paymentId: params.paymentId,
      cashierId: readString(body.cashierId),
      externalReference: readString(body.externalReference),
      note: readString(body.note),
    });

    return NextResponse.json({
      acknowledged: true,
      payment,
    });
  } catch (error) {
    if (error instanceof CashierPaymentError) {
      return errorResponse(error.message, error.status);
    }

    console.error('cashier direct payments: ack failed', error);
    return errorResponse('Impossible de confirmer la reception caissier.', 500);
  }
}
