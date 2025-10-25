type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

type RateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
};

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60_000,
  maxRequests: 120,
};

export const checkRateLimit = (key: string, options: RateLimiterOptions = DEFAULT_OPTIONS): boolean => {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (existing && existing.expiresAt > now) {
    if (existing.count >= options.maxRequests) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  rateLimitStore.set(key, { count: 1, expiresAt: now + options.windowMs });
  return true;
};

export const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.expiresAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};
