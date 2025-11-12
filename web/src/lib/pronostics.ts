'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '@/lib/firebaseClient';

export const REQUIRED_APP_SHARES: number = 2;
export const LOCAL_SHARE_COUNT_KEY_PREFIX = 'pronostics_share_count_v1';
export const PENDING_SUBMISSION_KEY_PREFIX = 'pronostics_pending_submission_v1';

const functions = getFunctions(firebaseApp);

export type SubmitPronosticRequest = {
  matchId: string;
  scoreA: number;
  scoreB: number;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  predictionId?: string | null;
};

export type SubmitPronosticResponse = {
  success: boolean;
  message: string;
  predictionId?: string;
};

export function normalizePhone(value: string): string {
  return value.replace(/\D+/g, '');
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim();
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }
  const [first, ...rest] = normalized.split(/\s+/);
  return {
    firstName: first ?? '',
    lastName: rest.join(' ').trim(),
  };
}

export async function submitPronostic(request: SubmitPronosticRequest): Promise<SubmitPronosticResponse> {
  const callable = httpsCallable<SubmitPronosticRequest, SubmitPronosticResponse>(functions, 'submitPrediction');
  const result = await callable(request);
  return result.data;
}

export function getShareStorageKey(matchId: string, userKey = 'guest'): string {
  return `${LOCAL_SHARE_COUNT_KEY_PREFIX}_${matchId}_${userKey}`;
}

export function getPendingSubmissionKey(matchId: string, userKey = 'guest'): string {
  return `${PENDING_SUBMISSION_KEY_PREFIX}_${matchId}_${userKey}`;
}
