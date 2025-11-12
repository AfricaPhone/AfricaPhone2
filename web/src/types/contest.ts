export type ContestPhase = 'registration' | 'voting' | 'results' | 'closed';

export type ContestSettings = {
  contestId: string;
  sitePublicUrl?: string;
  isOpen: boolean;
  phase: ContestPhase;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_CONTEST_SETTINGS: ContestSettings = {
  contestId: 'press-stars',
  isOpen: false,
  phase: 'registration',
};

export const normalizeContestPhase = (value: unknown): ContestPhase => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'registration' || normalized === 'voting' || normalized === 'results' || normalized === 'closed') {
      return normalized;
    }
  }
  return 'registration';
};
