import { createHash } from 'node:crypto';

export const sha256HexNode = (value: string): string => {
  return createHash('sha256').update(value).digest('hex');
};
