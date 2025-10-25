type SecurityHeadersOptions = {
  isDev: boolean;
  isLocalhost: boolean;
};

const baseConnectSources = [
  "'self'",
  'https://firestore.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firebasedynamiclinks.googleapis.com',
  'https://www.google-analytics.com',
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'https://vitals.vercel-insights.com',
];

const baseFontSources = ["'self'", 'https://fonts.gstatic.com', 'data:'];
const baseStyleSources = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];
const baseScriptSources = ["'self'", "'unsafe-inline'"];

const buildCsp = (options: SecurityHeadersOptions): string => {
  const connectSrc = [...baseConnectSources];
  const scriptSrc = [...baseScriptSources];

  if (options.isDev) {
    connectSrc.push('ws:');
    scriptSrc.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${baseStyleSources.join(' ')}`,
    "img-src 'self' data: blob: https:",
    `font-src ${baseFontSources.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
};

export const buildSecurityHeaders = (options: SecurityHeadersOptions): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Security-Policy': buildCsp(options),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy':
      'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-DNS-Prefetch-Control': 'off',
    'Origin-Agent-Cluster': '?1',
  };

  if (!options.isLocalhost) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  return headers;
};
