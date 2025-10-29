import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { MOCK_CONTEST, MOCK_CANDIDATES } from '@/data/mockContest';
import type { Candidate, Contest } from '@/types/pronostics';

type ContestStatus = Contest['status'];

const DEFAULT_STATUS: ContestStatus = 'active';
const isMockContest = (id?: string | null) => id === MOCK_CONTEST.id;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toDate = (value: unknown): Date => {
  if (!value) {
    return new Date();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return converted;
      }
    } catch (error) {
      console.warn('contestService.toDate: unable to convert timestamp', error);
    }
  }
  return new Date();
};

const mapContest = (snapshot: DocumentSnapshot<DocumentData>): Contest | null => {
  const data = snapshot.data();
  if (!data) {
    return null;
  }

  const endDate = toDate(data.endDate ?? data.endsAt ?? data.end_time);
  const hasEnded = endDate.getTime() <= Date.now();
  const statusValue = data.status === 'ended' || hasEnded ? 'ended' : DEFAULT_STATUS;

  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : 'Concours',
    description: typeof data.description === 'string' ? data.description : '',
    endDate,
    status: statusValue,
    totalParticipants: toNumber(data.totalParticipants ?? data.participantCount ?? data.totalCandidates),
    totalVotes: toNumber(data.totalVotes ?? data.voteCount),
  };
};

const mapCandidate = (snapshot: QueryDocumentSnapshot<DocumentData>, contestId: string): Candidate => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    contestId,
    name: typeof data.name === 'string' ? data.name : 'Candidat',
    media: typeof data.media === 'string' ? data.media : '',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    voteCount: toNumber(data.voteCount ?? data.votes),
  };
};

export const subscribeToContest = (
  contestId: string,
  onData: (contest: Contest | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (isMockContest(contestId)) {
    const timeoutId = setTimeout(() => {
      onData({ ...MOCK_CONTEST, endDate: new Date(MOCK_CONTEST.endDate) });
    }, 0);
    return () => clearTimeout(timeoutId);
  }

  const contestRef = doc(db, 'contests', contestId);
  return onSnapshot(
    contestRef,
    snapshot => {
      onData(mapContest(snapshot));
    },
    error => {
      console.error('contestService.subscribeToContest error', error);
      onError?.(error as Error);
    }
  );
};

export const subscribeToCandidates = (
  contestId: string,
  onData: (candidates: Candidate[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (isMockContest(contestId)) {
    const timeoutId = setTimeout(() => {
      onData([...MOCK_CANDIDATES]);
    }, 0);
    return () => clearTimeout(timeoutId);
  }

  const candidatesRef = collection(db, 'contests', contestId, 'candidates');
  const candidatesQuery = query(candidatesRef, orderBy('voteCount', 'desc'));

  return onSnapshot(
    candidatesQuery,
    snapshot => {
      const candidates = snapshot.docs.map(docSnap => mapCandidate(docSnap, contestId));
      onData(candidates);
    },
    error => {
      console.error('contestService.subscribeToCandidates error', error);
      onError?.(error as Error);
    }
  );
};

export const fetchActiveContestId = async (): Promise<string | null> => {
  try {
    const contestsRef = collection(db, 'contests');
    const activeQuery = query(contestsRef, where('status', '==', DEFAULT_STATUS), limit(20));
    const snapshot = await getDocs(activeQuery);
    if (snapshot.empty) {
      return MOCK_CONTEST.id;
    }
    const sorted = snapshot.docs
      .map(docSnap => {
        const data = docSnap.data() || {};
        const endDateValue = toDate(data.endDate ?? data.endsAt ?? data.end_time).getTime();
        return {
          id: docSnap.id,
          endDateValue: Number.isFinite(endDateValue) ? endDateValue : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a.endDateValue - b.endDateValue);
    return sorted[0]?.id ?? MOCK_CONTEST.id;
  } catch (error) {
    console.warn('contestService.fetchActiveContestId: fallback to mock contest', error);
    return MOCK_CONTEST.id;
  }
};

export const getContestById = async (contestId: string): Promise<Contest | null> => {
  if (isMockContest(contestId)) {
    return { ...MOCK_CONTEST, endDate: new Date(MOCK_CONTEST.endDate) };
  }
  const snapshot = await getDoc(doc(db, 'contests', contestId));
  return mapContest(snapshot);
};

export const computeContestTotals = (
  contest: Contest | null,
  candidates: Candidate[]
): Pick<Contest, 'totalParticipants' | 'totalVotes'> => {
  const derivedParticipants = candidates.length;
  const derivedVotes = candidates.reduce((total, candidate) => total + toNumber(candidate.voteCount), 0);

  return {
    totalParticipants:
      contest?.totalParticipants && contest.totalParticipants > 0 ? contest.totalParticipants : derivedParticipants,
    totalVotes: contest?.totalVotes && contest.totalVotes > 0 ? contest.totalVotes : derivedVotes,
  };
};
