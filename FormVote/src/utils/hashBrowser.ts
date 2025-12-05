const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const fnv1aHex = (value: string, seed = 2166136261): string => {
  // FNV-1a 32-bit implementation.
  let hash = seed;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const fallbackHash64 = (value: string): string => {
  // Deterministic 64-hex fallback when Web Crypto or TextEncoder is unavailable.
  // We chain multiple FNV-1a rounds with evolving seeds to reach 64 hex chars.
  let result = '';
  let seed = 2166136261;
  let salt = value;

  while (result.length < 64) {
    const chunk = fnv1aHex(`${salt}:${result.length}`, seed);
    result += chunk;
    // Derive the next seed from the current chunk to avoid repetition.
    seed = parseInt(chunk.slice(0, 8), 16) ^ 0x9e3779b9;
    salt = chunk;
  }

  return result.slice(0, 64);
};

export const sha256HexBrowser = async (value: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle && textEncoder) {
    const data = textEncoder.encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return fallbackHash64(value);
};
