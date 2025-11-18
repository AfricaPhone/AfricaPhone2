import type { ContestCandidateDraft } from '@/types/contestSubmission';
import { contestDraftStorageKey } from '@/utils/contestCandidate';

type StoredDraft = ContestCandidateDraft & {
  savedAt: number;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadContestDraft = (): ContestCandidateDraft | null => {
  if (!isBrowser) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(contestDraftStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed && typeof parsed === 'object') {
      const { savedAt, ...draft } = parsed;
      if (typeof savedAt === 'number') {
        return draft;
      }
    }
  } catch (error) {
    console.warn('contestDraft: unable to parse draft from storage', error);
  }
  return null;
};

export const saveContestDraft = (draft: ContestCandidateDraft): boolean => {
  if (!isBrowser) {
    return false;
  }
  try {
    const payload: StoredDraft = {
      ...draft,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(contestDraftStorageKey, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('contestDraft: unable to persist draft', error);
    return false;
  }
};

export const clearContestDraft = (): void => {
  if (!isBrowser) {
    return;
  }
  try {
    window.localStorage.removeItem(contestDraftStorageKey);
  } catch (error) {
    console.warn('contestDraft: unable to clear draft', error);
  }
};
