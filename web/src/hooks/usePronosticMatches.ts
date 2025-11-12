'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Match } from '@/types/pronostics';
import { demoMatch, demoSecondaryMatch } from '@/data/pronostics-demo';

type PronosticMatchesState = {
  matches: Match[];
  loading: boolean;
  error: string | null;
};

/**
 * Placeholder hook that will be wired to Firestore in a later step.
 * For now it exposes the shape consumed by the pronostics page.
 */

const HARDCODED_MATCHES: Match[] = [demoMatch, demoSecondaryMatch];

export function usePronosticMatches(): PronosticMatchesState {
  const [matches, setMatches] = useState<Match[]>(HARDCODED_MATCHES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const matchesRef = collection(db, 'matches');
    const matchesQuery = query(matchesRef, orderBy('startTime', 'desc'));

    const unsubscribe = onSnapshot(
      matchesQuery,
      snapshot => {
        const mapped: Match[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data) {
            return;
          }

          const teamA = typeof data.teamA === 'string' ? data.teamA : null;
          const teamB = typeof data.teamB === 'string' ? data.teamB : null;
          const competition = typeof data.competition === 'string' ? data.competition : 'Match';
          const startTime = data.startTime;

          if (!teamA || !teamB || !startTime) {
            return;
          }

          mapped.push({
            id: docSnap.id,
            teamA,
            teamB,
            competition,
            startTime,
            teamALogo: typeof data.teamALogo === 'string' ? data.teamALogo : null,
            teamBLogo: typeof data.teamBLogo === 'string' ? data.teamBLogo : null,
            finalScoreA: typeof data.finalScoreA === 'number' ? data.finalScoreA : null,
            finalScoreB: typeof data.finalScoreB === 'number' ? data.finalScoreB : null,
            predictionCount: typeof data.predictionCount === 'number' ? data.predictionCount : 0,
            trends: typeof data.trends === 'object' && data.trends ? data.trends : undefined,
          });
        });

        setMatches(mapped.length > 0 ? mapped : HARDCODED_MATCHES);
        setError(null);
        setLoading(false);
      },
      (firestoreError: FirestoreError) => {
        console.error('usePronosticMatches: unable to read matches', firestoreError);
        setMatches(HARDCODED_MATCHES);
        setError('Impossible de charger les matchs pour le moment.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(
    () => ({
      matches,
      loading,
      error,
    }),
    [error, loading, matches]
  );
}
