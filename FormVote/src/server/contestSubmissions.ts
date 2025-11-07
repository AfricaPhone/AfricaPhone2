import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ContestSubmissionSettings } from '@/types/contestSubmission';

const DEFAULT_CONTEST_ID = 'press-stars-2025';
const DEFAULT_PUBLIC_SITE = 'https://africaphone-contest-form.web.app/votes';

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

export const fetchContestSubmissionSettings = async (): Promise<ContestSubmissionSettings> => {
  const snapshot = await getSettingsRef().get();
  if (!snapshot.exists) {
    return {
      contestId: DEFAULT_CONTEST_ID,
      sitePublicUrl: DEFAULT_PUBLIC_SITE,
      isOpen: false,
    };
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
};
