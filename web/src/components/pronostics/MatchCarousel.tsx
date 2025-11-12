'use client';

import { useMemo } from 'react';
import type { Match } from '@/types/pronostics';

export type MatchCarouselProps = {
  matches: Match[];
  loading: boolean;
  error: string | null;
  activeMatchId: string | null;
  onSelect: (matchId: string) => void;
};

export default function MatchCarousel({ matches, loading, error, activeMatchId, onSelect }: MatchCarouselProps) {
  const content = useMemo(() => {
    if (loading) {
      return <MatchCarouselSkeleton />;
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || 'Impossible de charger les matchs pour le moment.'}
        </div>
      );
    }

    if (matches.length === 0) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Aucun match disponible pour le moment. Revenez plus tard.
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col gap-3">
        {matches.map(match => (
          <MatchItem
            key={match.id}
            match={match}
            active={match.id === activeMatchId}
            onSelect={() => onSelect(match.id)}
          />
        ))}
      </div>
    );
  }, [activeMatchId, error, loading, matches, onSelect]);

  return (
    <section aria-labelledby="match-carousel-title" className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Jeu concours</p>
          <h1 id="match-carousel-title" className="text-xl font-bold text-slate-900">
            Pronostics en cours
          </h1>
        </div>
      </header>
      {content}
    </section>
  );
}

type MatchItemProps = {
  match: Match;
  active: boolean;
  onSelect: () => void;
};

function MatchItem({ match, active, onSelect }: MatchItemProps) {
  const matchDate = match.startTime?.toDate?.();
  const startLabel = matchDate
    ? new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(matchDate)
    : 'Date à confirmer';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 transition ${
        active
          ? 'border-orange-400 bg-orange-50 shadow-sm shadow-orange-100'
          : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
      }`}
    >
      <div className="flex flex-1 flex-col text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{match.competition}</span>
        <p className="text-lg font-semibold text-slate-900">
          {match.teamA} <span className="text-sm font-normal text-slate-500">vs</span> {match.teamB}
        </p>
        <p className="text-xs text-slate-500">{startLabel}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participants</span>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
          {match.predictionCount ?? 0}
        </span>
      </div>
    </button>
  );
}

function MatchCarouselSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`match-skeleton-${index}`}
          className="h-20 rounded-2xl border border-slate-100 bg-slate-50"
        >
          <div className="h-full w-full animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
        </div>
      ))}
    </div>
  );
}
