// src/data/mockContestData.ts
import { Contest, Candidate } from '../types';

export const MOCK_CONTEST: Contest = {
  id: 'journalistes-tech-2025',
  title: 'Trophée du Journaliste Tech 2025',
  description:
    "Votez pour le journaliste qui a le mieux couvert l'actualité technologique au Bénin cette année. Chaque vote compte pour soutenir le journalisme de qualité !",
  endDate: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000), // Fin dans 10 jours
  totalParticipants: 5,
  totalVotes: 8750,
  status: 'active',
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    contestId: 'journalistes-tech-2025',
    name: 'Elise Adjovi',
    media: 'Tech Benin',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256',
    voteCount: 2540,
  },
  {
    id: 'cand-02',
    contestId: 'journalistes-tech-2025',
    name: 'Jean-Luc Bocco',
    media: 'Digital Africa',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256',
    voteCount: 1980,
  },
  {
    id: 'cand-03',
    contestId: 'journalistes-tech-2025',
    name: 'Amina Diallo',
    media: 'Le Matinal Numérique',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256',
    voteCount: 1850,
  },
  {
    id: 'cand-04',
    contestId: 'journalistes-tech-2025',
    name: 'David Zinsou',
    media: 'Podcast Tech & Co',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256',
    voteCount: 1520,
  },
  {
    id: 'cand-05',
    contestId: 'journalistes-tech-2025',
    name: 'Fatou Kante',
    media: 'WebTV Cotonou',
    photoUrl: 'https://images.unsplash.com/photo-1488426862026-39b533079b33?q=80&w=256',
    voteCount: 860,
  },
];

// SUPPRESSION: Les données MOCK_STATS ne sont plus nécessaires
