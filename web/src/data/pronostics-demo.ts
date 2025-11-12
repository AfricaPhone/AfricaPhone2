import { Timestamp } from 'firebase/firestore';
import type { Match, Prediction } from '@/types/pronostics';

export const DEMO_MATCH_ID = 'demo-classico';

export const demoMatch: Match = {
  id: DEMO_MATCH_ID,
  teamA: 'Real Madrid',
  teamB: 'FC Barcelona',
  competition: 'Classico',
  startTime: Timestamp.fromDate(new Date('2025-10-26T16:15:00Z')),
  teamALogo: null,
  teamBLogo: null,
  finalScoreA: null,
  finalScoreB: null,
  predictionCount: 27,
  trends: {
    '2-1': 4,
    '3-2': 3,
    '3-1': 3,
    '2-4': 2,
    '1-0': 2,
    '2-2': 2,
  },
};

export const DEMO_MATCH_ID_SECONDARY = 'demo-test-a-b';

export const demoSecondaryMatch: Match = {
  id: DEMO_MATCH_ID_SECONDARY,
  teamA: 'TestA',
  teamB: 'TestB',
  competition: 'Match de démonstration',
  startTime: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  teamALogo: null,
  teamBLogo: null,
  finalScoreA: null,
  finalScoreB: null,
  predictionCount: 12,
  trends: {
    '1-0': 3,
    '2-1': 2,
    '0-0': 2,
    '3-2': 1,
    '2-2': 1,
    '0-1': 1,
  },
};

export const demoWinners: Prediction[] = [
  {
    id: 'demo-winner-1',
    matchId: DEMO_MATCH_ID,
    userId: 'demo-user-1',
    userName: 'Aicha',
    scoreA: 2,
    scoreB: 1,
    isWinner: true,
  },
  {
    id: 'demo-winner-2',
    matchId: DEMO_MATCH_ID,
    userId: 'demo-user-2',
    userName: 'Junior',
    scoreA: 3,
    scoreB: 1,
    isWinner: true,
  },
  {
    id: 'demo-winner-3',
    matchId: DEMO_MATCH_ID,
    userId: 'demo-user-3',
    userName: 'Fatou',
    scoreA: 2,
    scoreB: 2,
    isWinner: true,
  },
];

export const demoSecondaryWinners: Prediction[] = [
  {
    id: 'demo2-winner-1',
    matchId: DEMO_MATCH_ID_SECONDARY,
    userId: 'demo2-user-1',
    userName: 'Tester A',
    scoreA: 1,
    scoreB: 0,
    isWinner: true,
  },
];
