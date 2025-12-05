import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export const sha256HexBrowser = async (value: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle && textEncoder) {
    const data = textEncoder.encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return bytesToHex(sha256(utf8ToBytes(value)));
};
