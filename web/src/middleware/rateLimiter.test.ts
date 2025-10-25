import { checkRateLimit, cleanupRateLimitStore } from './rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    cleanupRateLimitStore();
  });

  it('allows requests under the threshold', () => {
    const key = 'tester';
    const result = checkRateLimit(key, { windowMs: 1000, maxRequests: 3 });
    expect(result).toBe(true);
  });

  it('blocks once the limit is reached', () => {
    const key = 'over-limit';
    const options = { windowMs: 1000, maxRequests: 2 };
    expect(checkRateLimit(key, options)).toBe(true);
    expect(checkRateLimit(key, options)).toBe(true);
    expect(checkRateLimit(key, options)).toBe(false);
  });

  it('resets after the window expires', () => {
    const key = 'reset-key';
    const options = { windowMs: 10, maxRequests: 1 };
    expect(checkRateLimit(key, options)).toBe(true);
    expect(checkRateLimit(key, options)).toBe(false);
    return new Promise<void>(resolve => {
      setTimeout(() => {
        cleanupRateLimitStore();
        expect(checkRateLimit(key, options)).toBe(true);
        resolve();
      }, 15);
    });
  });
});
