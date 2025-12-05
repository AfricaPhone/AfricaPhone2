import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const HEX_64_REGEX = /^[a-f0-9]{64}$/;

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
    expect(hash).toMatch(HEX_64_REGEX);
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
    } finally {
      (global as any).crypto = originalCrypto;
      (global as any).TextEncoder = originalTextEncoder;
    }
  });
});
