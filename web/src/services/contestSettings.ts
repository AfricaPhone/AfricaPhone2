'use client';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { ContestSettings } from '@/types/contest';
import { DEFAULT_CONTEST_SETTINGS, normalizeContestPhase } from '@/types/contest';

const SETTINGS_DOC_PATH = ['contestSubmissions', 'settings'] as const;

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (/^(true|1)$/i.test(value.trim())) {
      return true;
    }
    if (/^(false|0)$/i.test(value.trim())) {
      return false;
    }
  }
  return fallback;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

export async function fetchContestSettings(): Promise<ContestSettings> {
  try {
    const snapshot = await getDoc(doc(db, ...SETTINGS_DOC_PATH));
    if (!snapshot.exists()) {
      return DEFAULT_CONTEST_SETTINGS;
    }

    const data = snapshot.data() ?? {};
    return {
      contestId: toStringOrUndefined(data.contestId) ?? DEFAULT_CONTEST_SETTINGS.contestId,
      sitePublicUrl: toStringOrUndefined(data.sitePublicUrl),
      isOpen: toBoolean(data.isOpen, DEFAULT_CONTEST_SETTINGS.isOpen),
      phase: normalizeContestPhase(data.phase),
      updatedAt: toStringOrUndefined(data.updatedAt),
      updatedBy: toStringOrUndefined(data.updatedBy),
    };
  } catch (error) {
    console.warn('contestSettings: unable to fetch settings from Firestore.', error);
    return DEFAULT_CONTEST_SETTINGS;
  }
}
