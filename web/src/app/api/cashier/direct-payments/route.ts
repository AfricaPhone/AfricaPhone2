import { NextResponse, type NextRequest } from 'next/server';
import { requireCashierApiKey } from '@/server/cashierApiAuth';
import { listDirectCashierPayments } from '@/server/cashierDirectPayments';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const parseLimit = (value: string | null) => {
  const limit = Number(value);
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.max(1, Math.min(100, Math.round(limit)));
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = requireCashierApiKey(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const payments = await listDirectCashierPayments({
      limit: parseLimit(request.nextUrl.searchParams.get('limit')),
      sinceIso: request.nextUrl.searchParams.get('since'),
      onlyUnacknowledged: request.nextUrl.searchParams.get('unacknowledged') === '1',
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('cashier direct payments: list failed', error);
    return errorResponse('Impossible de charger les paiements caissier.', 500);
  }
}
