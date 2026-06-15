import { buildSecurityHeaders } from './securityHeaders';

describe('buildSecurityHeaders', () => {
  it('produces secure headers in production', () => {
    const headers = buildSecurityHeaders({ isDev: false, isLocalhost: false });
    const csp = headers['Content-Security-Policy'];

    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Permissions-Policy']).toContain('geolocation=(self)');
  });

  it('relaxes policies for localhost development', () => {
    const headers = buildSecurityHeaders({ isDev: true, isLocalhost: true });
    const csp = headers['Content-Security-Policy'];

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws:');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });
});
