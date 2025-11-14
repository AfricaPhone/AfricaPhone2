import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ContestSubmissionSettings } from '@/types/contestSubmission';

const DEFAULT_CONTEST_ID = 'press-stars-2025';
const DEFAULT_PUBLIC_SITE = 'https://africaphone.org/votes';

const getSettingsRef = () => getAdminDb().collection('contestSubmissions').doc('settings');

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

const getFallbackSettings = (): ContestSubmissionSettings => {
  const envContestId = process.env.CONTEST_SUBMISSIONS_DEFAULT_CONTEST_ID;
  const envSiteUrl = process.env.CONTEST_SUBMISSIONS_DEFAULT_SITE_URL;

  return {
    contestId: typeof envContestId === 'string' && envContestId.trim() ? envContestId.trim() : DEFAULT_CONTEST_ID,
    sitePublicUrl: typeof envSiteUrl === 'string' && envSiteUrl.trim() ? envSiteUrl.trim() : DEFAULT_PUBLIC_SITE,
    isOpen: normalizeBoolean(process.env.CONTEST_SUBMISSIONS_DEFAULT_IS_OPEN, false),
  };
};

const hasAdminCredentials = (): boolean => {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS && process.env.FIREBASE_ADMIN_CREDENTIALS.trim()) {
    return true;
  }
  if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim()) {
    return true;
  }
  return false;
};

export const fetchContestSubmissionSettings = async (): Promise<ContestSubmissionSettings> => {
  if (!hasAdminCredentials()) {
    return getFallbackSettings();
  }

  try {
    const snapshot = await getSettingsRef().get();
    if (!snapshot.exists) {
      return getFallbackSettings();
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
    console.warn('contestSubmissions.fetchContestSubmissionSettings: falling back to defaults', error);
    return getFallbackSettings();
  }
};
