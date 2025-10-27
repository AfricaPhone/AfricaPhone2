import type { Candidate, Contest } from '@/types/pronostics';

export const MOCK_CONTEST: Contest = {
  id: 'mock-contest-demo',
  title: 'AfricaPhone Awards (démo)',
  description:
    "Votez pour votre journaliste technologique préféré et découvrez le flux de paiement KKiaPay directement sur le site web.",
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'active',
  totalParticipants: 5,
  totalVotes: 8750,
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'mock-cand-01',
    contestId: MOCK_CONTEST.id,
    name: 'Elise Adjovi',
    media: 'Tech Benin',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    voteCount: 2540,
  },
  {
    id: 'mock-cand-02',
    contestId: MOCK_CONTEST.id,
    name: 'Jean-Luc Bocco',
    media: 'Digital Africa',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    voteCount: 1980,
  },
  {
    id: 'mock-cand-03',
    contestId: MOCK_CONTEST.id,
    name: 'Amina Diallo',
    media: 'Le Matinal Numérique',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    voteCount: 1850,
  },
  {
    id: 'mock-cand-04',
    contestId: MOCK_CONTEST.id,
    name: 'David Zinsou',
    media: 'Podcast Tech & Co',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    voteCount: 1520,
  },
  {
    id: 'mock-cand-05',
    contestId: MOCK_CONTEST.id,
    name: 'Fatou Kante',
    media: 'WebTV Cotonou',
    photoUrl: 'https://images.unsplash.com/photo-1488426862026-39b533079b33?auto=format&fit=crop&w=256&q=80',
    voteCount: 860,
  },
];
