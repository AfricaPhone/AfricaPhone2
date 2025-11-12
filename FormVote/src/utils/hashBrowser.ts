const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const fallbackHash = (value: string): string => {
  // FNV-1a fallback when Web Crypto is unavailable.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export const sha256HexBrowser = async (value: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle && textEncoder) {
    const data = textEncoder.encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return fallbackHash(value);
};
