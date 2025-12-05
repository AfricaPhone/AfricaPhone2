import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ContestSubmissionSettings } from '@/types/contestSubmission';
import { computeContestSchedule } from '@/utils/contestSchedule';

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
    const schedule = computeContestSchedule({});
    return {
      contestId: DEFAULT_CONTEST_ID,
      sitePublicUrl: DEFAULT_PUBLIC_SITE,
      isOpen: schedule.isSubmissionOpen,
      isSubmissionOpen: schedule.isSubmissionOpen,
      isVotingOpen: schedule.isVotingOpen,
      phase: schedule.phase,
      submissionOpenAt: schedule.submissionOpenAt,
      submissionCloseAt: schedule.submissionCloseAt,
      votingOpenAt: schedule.votingOpenAt,
      votingCloseAt: schedule.votingCloseAt,
    };
  }

  const data = snapshot.data() ?? {};
  const schedule = computeContestSchedule({
    submissionOpenAt: data.submissionOpenAt,
    submissionCloseAt: data.submissionCloseAt,
    votingOpenAt: data.votingOpenAt,
    votingCloseAt: data.votingCloseAt,
  });

  return {
    contestId: typeof data.contestId === 'string' && data.contestId.trim() ? data.contestId : DEFAULT_CONTEST_ID,
    sitePublicUrl:
      typeof data.sitePublicUrl === 'string' && data.sitePublicUrl.trim() ? data.sitePublicUrl : DEFAULT_PUBLIC_SITE,
    isOpen: schedule.isSubmissionOpen,
    isSubmissionOpen: schedule.isSubmissionOpen,
    isVotingOpen: schedule.isVotingOpen,
    phase: schedule.phase,
    submissionOpenAt: schedule.submissionOpenAt,
    submissionCloseAt: schedule.submissionCloseAt,
    votingOpenAt: schedule.votingOpenAt,
    votingCloseAt: schedule.votingCloseAt,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
};
