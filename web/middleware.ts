import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildSecurityHeaders } from './src/utils/securityHeaders';
import { checkRateLimit, cleanupRateLimitStore } from './src/middleware/rateLimiter';

const isDev = process.env.NODE_ENV !== 'production';

const isLocalhostHost = (hostHeader: string | null): boolean => {
  if (!hostHeader) {
    return false;
  }
  return (
    hostHeader.startsWith('localhost') ||
    hostHeader.startsWith('127.0.0.1') ||
    hostHeader.startsWith('0.0.0.0')
  );
};

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const clientIp =
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    host ||
    'unknown';

  cleanupRateLimitStore();

  if (!isLocalhostHost(host) && !checkRateLimit(clientIp)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    });
  }

  const response = NextResponse.next();

  const headers = buildSecurityHeaders({
    isDev,
    isLocalhost: isLocalhostHost(host),
  });

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
