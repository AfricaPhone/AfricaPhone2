import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const getConfiguredApiKey = () =>
  (process.env.CASHIER_API_KEY || process.env.AFRICAPHONE_CASHIER_API_KEY || '').trim();

const getPresentedApiKey = (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme === 'Bearer' && token) {
    return token.trim();
  }

  return (request.headers.get('x-api-key') || '').trim();
};

const safeEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const requireCashierApiKey = (request: NextRequest) => {
  const configuredKey = getConfiguredApiKey();
  if (!configuredKey) {
    return { ok: false as const, response: errorResponse('API caissier non configuree.', 503) };
  }

  const presentedKey = getPresentedApiKey(request);
  if (!presentedKey || !safeEquals(presentedKey, configuredKey)) {
    return { ok: false as const, response: errorResponse('Cle API caissier invalide.', 401) };
  }

  return { ok: true as const };
};
