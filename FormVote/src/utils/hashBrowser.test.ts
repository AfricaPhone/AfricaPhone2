import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const HEX_64_REGEX = /^[a-f0-9]{64}$/;
const HELLO_SHA256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

describe('sha256HexBrowser', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    // Ensure globals are clean after tests that monkeypatch them.
    jest.restoreAllMocks();
  });

  it('returns a 64-hex digest when Web Crypto is available', async () => {
    const { sha256HexBrowser } = await import('@/utils/hashBrowser');
    const hash = await sha256HexBrowser('hello');
    expect(hash).toBe(HELLO_SHA256);
  });

  it('falls back to a deterministic 64-hex digest when Web Crypto is unavailable', async () => {
    const originalCrypto = (global as any).crypto;
    const originalTextEncoder = (global as any).TextEncoder;

    (global as any).crypto = undefined;
    (global as any).TextEncoder = undefined;
    jest.resetModules();

    try {
      const { sha256HexBrowser } = await import('@/utils/hashBrowser');
      const hash = await sha256HexBrowser('hello');
      expect(hash).toMatch(HEX_64_REGEX);
      expect(hash).toBe(HELLO_SHA256);
    } finally {
      (global as any).crypto = originalCrypto;
      (global as any).TextEncoder = originalTextEncoder;
    }
  });
});
