import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ContestSubmissionSettings } from '@/types/contestSubmission';

const DEFAULT_CONTEST_ID = 'f9NdI6f1lH7Z2ZxUzEFt';
const DEFAULT_PUBLIC_SITE = 'https://africaphone-contest-form.web.app/votes';

const DEFAULT_SETTINGS: ContestSubmissionSettings = {
  contestId: DEFAULT_CONTEST_ID,
  sitePublicUrl: DEFAULT_PUBLIC_SITE,
  isOpen: false,
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return fallback;
};

const hasLocalAdminCredentials = () => {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    return true;
  }
  if (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64)
  ) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return true;
  }
  return false;
};

const shouldUseFirestore = () => {
  if (process.env.CONTEST_FORM_USE_STATIC_SETTINGS === 'true') {
    return false;
  }
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }
  return hasLocalAdminCredentials();
};

const buildDefaultSettings = (): ContestSubmissionSettings => ({
  ...DEFAULT_SETTINGS,
});

export const fetchContestSubmissionSettings = async (): Promise<ContestSubmissionSettings> => {
  if (!shouldUseFirestore()) {
    console.warn('contestSubmissions: using default settings (Firebase Admin credentials missing in development).');
    return buildDefaultSettings();
  }

  try {
    const snapshot = await getAdminDb().collection('contestSubmissions').doc('settings').get();
    if (!snapshot.exists) {
      return buildDefaultSettings();
    }

    const data = snapshot.data() ?? {};
    return {
      contestId: typeof data.contestId === 'string' && data.contestId.trim() ? data.contestId : DEFAULT_CONTEST_ID,
      sitePublicUrl:
        typeof data.sitePublicUrl === 'string' && data.sitePublicUrl.trim() ? data.sitePublicUrl : DEFAULT_PUBLIC_SITE,
      isOpen: normalizeBoolean(data.isOpen, false),
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    };
  } catch (error) {
    console.warn('contestSubmissions: Firestore unavailable, falling back to default settings.', error);
    return buildDefaultSettings();
  }
};
