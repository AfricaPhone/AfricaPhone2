import { NextResponse, type NextRequest } from 'next/server';
import { requireOperationsApiKey } from '@/server/operationsApiAuth';
import { OperationsOrderError, transitionOperationsOrder } from '@/server/operationsOrders';
import type { CustomerOrderStatus, CustomerPaymentStatus } from '@/types/customerOrders';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });
const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const authResult = requireOperationsApiKey(request);
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
  const status = readString(body.status);
  if (!status) {
    return errorResponse('Statut demande requis.', 400);
  }

  try {
    const paymentStatus = readString(body.paymentStatus);
    const order = await transitionOperationsOrder({
      orderId: params.orderId,
      status: status as CustomerOrderStatus,
      paymentStatus: paymentStatus ? (paymentStatus as CustomerPaymentStatus) : null,
      actorRole: readString(body.actorRole),
      actorId: readString(body.actorId),
      externalReference: readString(body.externalReference),
      note: readString(body.note),
    });

    return NextResponse.json({
      updated: true,
      order,
    });
  } catch (error) {
    if (error instanceof OperationsOrderError) {
      return errorResponse(error.message, error.status);
    }

    console.error('operations orders: transition failed', error);
    return errorResponse('Impossible de mettre a jour la demande.', 500);
  }
}
