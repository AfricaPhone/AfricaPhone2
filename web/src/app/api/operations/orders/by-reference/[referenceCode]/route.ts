import { NextResponse, type NextRequest } from 'next/server';
import { requireOperationsApiKey } from '@/server/operationsApiAuth';
import { findOperationsOrderByReference, OperationsOrderError } from '@/server/operationsOrders';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { referenceCode: string } }) {
  const authResult = requireOperationsApiKey(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const order = await findOperationsOrderByReference(decodeURIComponent(params.referenceCode));
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      order,
    });
  } catch (error) {
    if (error instanceof OperationsOrderError) {
      return errorResponse(error.message, error.status);
    }

    console.error('operations orders: lookup failed', error);
    return errorResponse('Impossible de charger la demande.', 500);
  }
}
