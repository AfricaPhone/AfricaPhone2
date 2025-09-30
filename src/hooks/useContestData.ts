import { useEffect, useMemo, useState } from 'react';
import { Candidate, Contest } from '../types';
import {
  computeContestTotals,
  subscribeToCandidates,
  subscribeToContest,
} from '../services/contestService';

type UseContestDataResult = {
  contest: Contest | null;
  candidates: Candidate[];
  isLoading: boolean;
  error: string | null;
};

export const useContestData = (contestId: string | null | undefined): UseContestDataResult => {
  const [contest, setContest] = useState<Contest | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingContest, setLoadingContest] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) {
      setContest(null);
      setLoadingContest(false);
      return;
    }

    setLoadingContest(true);
    const unsubscribe = subscribeToContest(
      contestId,
      value => {
        setContest(value);
        setLoadingContest(false);
      },
      err => {
        setError(err.message);
        setLoadingContest(false);
      }
    );

    return () => unsubscribe();
  }, [contestId]);

  useEffect(() => {
    if (!contestId) {
      setCandidates([]);
      setLoadingCandidates(false);
      return;
    }

    setLoadingCandidates(true);
    const unsubscribe = subscribeToCandidates(
      contestId,
      items => {
        setCandidates(items);
        setLoadingCandidates(false);
      },
      err => {
        setError(err.message);
        setLoadingCandidates(false);
      }
    );

    return () => unsubscribe();
  }, [contestId]);

  const { totalParticipants, totalVotes } = useMemo(
    () => computeContestTotals(contest, candidates),
    [contest, candidates]
  );

  const enhancedContest = useMemo(() => {
    if (!contest) {
      return null;
    }
    return {
      ...contest,
      totalParticipants,
      totalVotes,
    };
  }, [contest, totalParticipants, totalVotes]);

  return {
    contest: enhancedContest,
    candidates,
    isLoading: loadingContest || loadingCandidates,
    error,
  };
};
