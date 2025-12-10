export type ContestPhase = 'submission' | 'voting' | 'closed';

export type ContestScheduleInput = {
  submissionOpenAt?: unknown;
  submissionCloseAt?: unknown;
  votingOpenAt?: unknown;
  votingCloseAt?: unknown;
};

export type ContestScheduleComputed = {
  submissionOpenAt?: string;
  submissionCloseAt?: string;
  votingOpenAt?: string;
  votingCloseAt?: string;
  isSubmissionOpen: boolean;
  isVotingOpen: boolean;
  phase: ContestPhase;
};

const buildFallbackDates = (now: Date) => {
  const currentYear = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based (11 = December)
  const day = now.getUTCDate();
  const isPastDec25 = month > 11 || (month === 11 && day > 25);
  const targetYear = isPastDec25 ? currentYear + 1 : currentYear;

  const makeDate = (d: number) => new Date(Date.UTC(targetYear, 11, d, 0, 0, 0));

  return {
    submissionOpenAt: makeDate(4),
    submissionCloseAt: makeDate(15),
    votingOpenAt: makeDate(15),
    votingCloseAt: makeDate(25),
  };
};

const parseDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  // Firestore Timestamp compatibility.
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const parsed = (value as any).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

export const computeContestSchedule = (
  input: ContestScheduleInput,
  now: Date = new Date()
): ContestScheduleComputed => {
  const fallback = buildFallbackDates(now);

  const submissionOpenAt = parseDate(input.submissionOpenAt) ?? fallback.submissionOpenAt;
  const submissionCloseAt = parseDate(input.submissionCloseAt) ?? fallback.submissionCloseAt;
  const votingOpenAt = parseDate(input.votingOpenAt) ?? fallback.votingOpenAt;
  const votingCloseAt = parseDate(input.votingCloseAt) ?? fallback.votingCloseAt;

  const isSubmissionOpen = submissionOpenAt <= now && now < submissionCloseAt;
  const isVotingOpen = votingOpenAt <= now && now < votingCloseAt;

  let phase: ContestPhase = 'closed';
  if (isSubmissionOpen) {
    phase = 'submission';
  } else if (isVotingOpen) {
    phase = 'voting';
  }

  return {
    submissionOpenAt: toIso(submissionOpenAt),
    submissionCloseAt: toIso(submissionCloseAt),
    votingOpenAt: toIso(votingOpenAt),
    votingCloseAt: toIso(votingCloseAt),
    isSubmissionOpen,
    isVotingOpen,
    phase,
  };
};
