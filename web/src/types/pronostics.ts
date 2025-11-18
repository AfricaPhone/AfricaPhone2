import type { Timestamp } from 'firebase/firestore';

export type Match = {
  id: string;
  teamA: string;
  teamB: string;
  startTime: Timestamp;
  competition: string;
  teamALogo?: string | null;
  teamBLogo?: string | null;
  finalScoreA?: number | null;
  finalScoreB?: number | null;
  predictionCount?: number;
  trends?: Record<string, number>;
};

export type Prediction = {
  id: string;
  userId: string;
  matchId: string;
  userName: string;
  scoreA: number;
  scoreB: number;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isWinner?: boolean;
  featuredWinner?: boolean;
};

export type WinnerGalleryEntry = {
  id: string;
  name?: string;
  photoUrl: string;
  description?: string;
  isPublic?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MatchWithWinners = Match & {
  winners: Prediction[];
};

export type Contest = {
  id: string;
  title: string;
  description: string;
  endDate: Date;
  status: 'active' | 'ended';
  totalParticipants: number;
  totalVotes: number;
};

export type Candidate = {
  id: string;
  contestId: string;
  name: string;
  media: string;
  photoUrl: string;
  voteCount: number;
  updatedAt?: Date | null;
};
