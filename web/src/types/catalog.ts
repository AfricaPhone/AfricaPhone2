const ACCENT_REGEX = /[\u0300-\u036f]/g;

export type SegmentKey = 'telephone' | 'tablette' | 'portable a touche' | 'accessoire';

const normalizeSegmentString = (value: string): string =>
  value
    .normalize('NFD')
    .replace(ACCENT_REGEX, '')
    .toLowerCase();

export const inferSegmentKeyFromValue = (value: unknown): SegmentKey | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = normalizeSegmentString(value);
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.includes('tablett')) {
    return 'tablette';
  }
  if (normalized.includes('touch') || normalized.includes('touche') || normalized.includes('bouton')) {
    return 'portable a touche';
  }
  if (normalized.includes('accessoire') || normalized.includes('audio') || normalized.includes('gadget')) {
    return 'accessoire';
  }
  if (
    normalized.includes('tele') ||
    normalized.includes('phone') ||
    normalized.includes('mobile') ||
    normalized.includes('populaire')
  ) {
    return 'telephone';
  }
  return null;
};
