'use client';

import { useEffect, useMemo, useState } from 'react';
import { Timestamp, collection, doc, onSnapshot, orderBy, query, where, type FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Match, Prediction } from '@/types/pronostics';
import {
  DEMO_MATCH_ID,
  DEMO_MATCH_ID_SECONDARY,
  demoMatch,
  demoSecondaryMatch,
  demoSecondaryWinners,
  demoWinners,
} from '@/data/pronostics-demo';

type MatchInsightsState = {
  match: Match | null;
  winners: Prediction[];
  loadingMatch: boolean;
  loadingWinners: boolean;
  errorMatch: string | null;
  errorWinners: string | null;
};

export function usePronosticMatchInsights(matchId: string | null): MatchInsightsState {
  const [match, setMatch] = useState<Match | null>(null);
  const [winners, setWinners] = useState<Prediction[]>([]);
  const [loadingMatch, setLoadingMatch] = useState<boolean>(Boolean(matchId));
  const [loadingWinners, setLoadingWinners] = useState<boolean>(Boolean(matchId));
  const [errorMatch, setErrorMatch] = useState<string | null>(null);
  const [errorWinners, setErrorWinners] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoadingMatch(false);
      setErrorMatch(null);
      return;
    }

    if (matchId === DEMO_MATCH_ID || matchId === DEMO_MATCH_ID_SECONDARY) {
      setMatch(matchId === DEMO_MATCH_ID ? demoMatch : demoSecondaryMatch);
      setErrorMatch(null);
      setLoadingMatch(false);
      return;
    }

    setLoadingMatch(true);
    const matchRef = doc(db, 'matches', matchId);

    const unsubscribe = onSnapshot(
      matchRef,
      snap => {
        if (!snap.exists()) {
          setMatch(null);
          setErrorMatch("Ce match n'est plus disponible.");
          setLoadingMatch(false);
          return;
        }

        const data = snap.data();
        const teamA = typeof data.teamA === 'string' ? data.teamA : null;
        const teamB = typeof data.teamB === 'string' ? data.teamB : null;
        const startTime = data.startTime as Timestamp | undefined;

        if (!teamA || !teamB || !startTime) {
          setMatch(null);
          setErrorMatch('Informations match incomplètes.');
          setLoadingMatch(false);
          return;
        }

        setMatch({
          id: snap.id,
          teamA,
          teamB,
          competition: typeof data.competition === 'string' ? data.competition : 'Match',
          startTime,
          teamALogo: typeof data.teamALogo === 'string' ? data.teamALogo : null,
          teamBLogo: typeof data.teamBLogo === 'string' ? data.teamBLogo : null,
          finalScoreA: typeof data.finalScoreA === 'number' ? data.finalScoreA : null,
          finalScoreB: typeof data.finalScoreB === 'number' ? data.finalScoreB : null,
          predictionCount: typeof data.predictionCount === 'number' ? data.predictionCount : 0,
          trends: typeof data.trends === 'object' && data.trends ? data.trends : undefined,
        });
        setErrorMatch(null);
        setLoadingMatch(false);
      },
      (error: FirestoreError) => {
        console.error('usePronosticMatchInsights: match snapshot error', error);
        setMatch(null);
        setErrorMatch('Impossible de charger les détails du match.');
        setLoadingMatch(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setWinners([]);
      setLoadingWinners(false);
      setErrorWinners(null);
      return;
    }

    if (matchId === DEMO_MATCH_ID || matchId === DEMO_MATCH_ID_SECONDARY) {
      setWinners(matchId === DEMO_MATCH_ID ? demoWinners : demoSecondaryWinners);
      setErrorWinners(null);
      setLoadingWinners(false);
      return;
    }

    setLoadingWinners(true);
    const predictionsRef = collection(db, 'predictions');
    const winnersQuery = query(
      predictionsRef,
      where('matchId', '==', matchId),
      where('isWinner', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      winnersQuery,
      snapshot => {
        const mapped: Prediction[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data) {
            return;
          }
          const scoreA = typeof data.scoreA === 'number' ? data.scoreA : null;
          const scoreB = typeof data.scoreB === 'number' ? data.scoreB : null;
          const userId = typeof data.userId === 'string' ? data.userId : null;
          const userName = typeof data.userName === 'string' ? data.userName : null;

          if (scoreA === null || scoreB === null || !userId || !userName) {
            return;
          }

          mapped.push({
            id: docSnap.id,
            matchId,
            userId,
            userName,
            scoreA,
            scoreB,
            contactFirstName: typeof data.contactFirstName === 'string' ? data.contactFirstName : undefined,
            contactLastName: typeof data.contactLastName === 'string' ? data.contactLastName : undefined,
            contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : undefined,
            contactPhoneNormalized:
              typeof data.contactPhoneNormalized === 'string' ? data.contactPhoneNormalized : undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            isWinner: true,
            featuredWinner: Boolean(data.featuredWinner),
          });
        });

        setWinners(mapped);
        setErrorWinners(null);
        setLoadingWinners(false);
      },
      (error: FirestoreError) => {
        console.error('usePronosticMatchInsights: winners snapshot error', error);
        setWinners([]);
        setErrorWinners("Impossible de charger la liste des gagnants.");
        setLoadingWinners(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  return useMemo(
    () => ({
      match,
      winners,
      loadingMatch,
      loadingWinners,
      errorMatch,
      errorWinners,
    }),
    [errorMatch, errorWinners, loadingMatch, loadingWinners, match, winners]
  );
}
