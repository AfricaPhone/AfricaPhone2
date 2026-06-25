import { NextResponse, type NextRequest } from 'next/server';
import {
  isValidKkiapayWebhookSecret,
  markKkiapayWebhookFailure,
  PaymentFlowError,
  resolveKkiapayPaymentFromWebhook,
  verifyAndFinalizeKkiapayOrderPayment,
} from '@/server/kkiapayOrderPayments';
import {
  markKkiapayInstallmentWebhookFailure,
  verifyAndFinalizeKkiapayInstallmentPayment,
} from '@/server/kkiapayInstallmentPayments';

const jsonResponse = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isValidKkiapayWebhookSecret(request.headers.get('x-kkiapay-secret'))) {
    return jsonResponse({ received: false, message: 'Webhook Kkiapay non autorise.' }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ received: false, message: 'Payload invalide.' }, 400);
  }

  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const transactionId = toCleanString(body.transactionId);
  const partnerId = toCleanString(body.partnerId);
  const isPaymentSuccess = body.isPaymentSucces === true || body.isPaymentSuccess === true;

  const resolvedPayment = await resolveKkiapayPaymentFromWebhook({
    partnerId,
    transactionId,
  });

  if (!resolvedPayment) {
    console.warn('kkiapay webhook: payment not found', { partnerId, transactionId });
    return jsonResponse({ received: true, ignored: true }, 202);
  }

  try {
    if (!isPaymentSuccess) {
      const failureReason =
        toCleanString(body.failureMessage) || toCleanString(body.failureCode) || 'Paiement non confirme.';
      if (resolvedPayment.channel === 'installment_payment') {
        await markKkiapayInstallmentWebhookFailure({
          paymentId: resolvedPayment.paymentId,
          transactionId,
          failureReason,
        });
      } else {
        await markKkiapayWebhookFailure({
          orderId: resolvedPayment.orderId,
          paymentId: resolvedPayment.paymentId,
          transactionId,
          failureReason,
        });
      }
      return jsonResponse({ received: true, status: 'failed' });
    }

    if (resolvedPayment.channel === 'installment_payment') {
      if (!resolvedPayment.installmentPlanId) {
        throw new PaymentFlowError('Dossier cotisation introuvable pour ce paiement.', 409);
      }
      await verifyAndFinalizeKkiapayInstallmentPayment({
        installmentPlanId: resolvedPayment.installmentPlanId,
        paymentId: resolvedPayment.paymentId,
        transactionId,
        userId: null,
      });
    } else {
      await verifyAndFinalizeKkiapayOrderPayment({
        orderId: resolvedPayment.orderId,
        paymentId: resolvedPayment.paymentId,
        transactionId,
        userId: null,
      });
    }

    return jsonResponse({ received: true, status: 'succeeded' });
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      console.error('kkiapay webhook: payment flow error', error.message);
      return jsonResponse({ received: true, status: 'error', message: error.message }, error.status >= 500 ? 500 : 200);
    }

    console.error('kkiapay webhook: failed', error);
    return jsonResponse({ received: false, message: 'Webhook non traite.' }, 500);
  }
}
