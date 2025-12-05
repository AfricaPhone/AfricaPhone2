export const MAX_BIO_LENGTH = 400;
const PHONE_REGEX = /^\+\d{8,15}$/;

export const normalizePhoneNumber = (value: string): string | null => {
  if (!value) {
    return null;
  }
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  trimmed = trimmed
    .replace(/[^\d+]/g, '')
    .replace(/^00/, '+');

  if (!trimmed.startsWith('+')) {
    trimmed = `+${trimmed.replace(/^\+?/, '')}`;
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
};

export const normalizeEmail = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed;
};

export const isEmailValid = (value?: string | null): boolean => {
  if (!value) {
    return true;
  }
  const normalized = normalizeEmail(value);
  if (!normalized) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

export const slugifyCandidate = (value: string, fallback = 'candidate'): string => {
  const source = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return source || fallback;
};

export const limitText = (value: string, limit: number): string => {
  if (value.length <= limit) {
    return value;
  }
  return value.slice(0, limit);
};

export const contestDraftStorageKey = 'contest_candidate_draft_v1';
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const getPhotoStoragePrefix = (contestId: string, phoneHash: string): string => {
  const safeContestId = slugifyCandidate(contestId, 'contest');
  return `contest-submissions/${safeContestId}/${phoneHash.slice(0, 16)}`;
};

export const buildPhotoStoragePath = (
  contestId: string,
  phoneHash: string,
  suffix?: string,
  extension: (typeof ALLOWED_EXTENSIONS)[number] = 'jpg'
): string => {
  const prefix = getPhotoStoragePrefix(contestId, phoneHash);
  const normalizedSuffix = suffix ? suffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) : '';
  const formattedSuffix = normalizedSuffix ? `-${normalizedSuffix}` : '';
  const normalizedExt = extension.toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.includes(normalizedExt as any) ? normalizedExt : 'jpg';
  return `${prefix}${formattedSuffix}.${safeExt}`;
};

export const isPhotoPathValid = (contestId: string, phoneHash: string, photoPath?: string | null): boolean => {
  if (!photoPath) {
    return false;
  }
  const prefix = getPhotoStoragePrefix(contestId, phoneHash);
  if (!photoPath.startsWith(prefix)) {
    return false;
  }
  const extMatch = photoPath.match(/\.([a-z0-9]+)$/i);
  if (!extMatch) {
    return false;
  }
  const ext = extMatch[1].toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return false;
  }
  const remainder = photoPath.slice(prefix.length, -(ext.length + 1));
  return remainder === '' || /^-[a-z0-9]{1,12}$/.test(remainder);
};
