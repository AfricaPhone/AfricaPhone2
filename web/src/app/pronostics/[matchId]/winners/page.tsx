'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { SVGProps } from 'react';
import { usePronosticMatchInsights } from '@/hooks/usePronosticMatchInsights';
import type { Match, Prediction } from '@/types/pronostics';

type PageProps = {
  params: {
    matchId: string;
  };
};

export default function PronosticWinnersPage({ params }: PageProps) {
  const matchId = params.matchId ?? null;
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const insights = usePronosticMatchInsights(matchId);

  const match = insights.match;
  const matchEnded = useMemo(() => {
    if (!match) {
      return false;
    }
    return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  }, [match]);

  const filteredWinners = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return insights.winners;
    }
    return insights.winners.filter(winner => {
      const name = winner.userName?.toLowerCase?.() ?? '';
      return name.includes(normalized);
    });
  }, [insights.winners, searchTerm]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (matchId) {
      router.push(`/pronostics/${matchId}`);
    } else {
      router.push('/pronostics');
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <AppBar title="Gagnants" onBack={handleBack} />
      <main className="mx-auto w-full max-w-screen-sm px-4 pb-16 pt-4">
        <div className="flex flex-col gap-4">
          <MatchSummaryCard match={match} loading={insights.loadingMatch} error={insights.errorMatch} />
          <WinnersPanel
            winners={filteredWinners}
            totalWinners={insights.winners.length}
            loading={insights.loadingWinners}
            error={insights.errorWinners}
            matchEnded={matchEnded}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />
        </div>
      </main>
    </div>
  );
}

type AppBarProps = {
  title: string;
  onBack: () => void;
};

function AppBar({ title, onBack }: AppBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E7E9ED] bg-white">
      <div className="mx-auto grid h-14 w-full max-w-screen-sm grid-cols-[44px_1fr_44px] items-center px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#111827] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B6DE9] focus-visible:outline-offset-2"
          aria-label="Retour"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-center text-[18px] font-semibold">{title}</h1>
        <div className="h-11 w-11" aria-hidden />
      </div>
    </header>
  );
}

type MatchSummaryCardProps = {
  match: Match | null;
  loading: boolean;
  error: string | null;
};

function MatchSummaryCard({ match, loading, error }: MatchSummaryCardProps) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">
        <strong className="block text-base font-semibold text-rose-700">Erreur</strong>
        <p className="mt-1">{error}</p>
      </section>
    );
  }

  if (!match) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
        <strong className="block text-base font-semibold text-slate-800">Match indisponible</strong>
        <p className="mt-1">Selectionnez un match depuis la liste des pronostics.</p>
      </section>
    );
  }

  const hasScore = typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  const matchDate = match.startTime?.toDate?.();
  const dateLabel = matchDate
    ? matchDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;
  const timeLabel = matchDate
    ? matchDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-orange-500">{match.competition ?? 'Match'}</p>
      <h2 className="mt-2 text-lg font-bold text-slate-900">
        {match.teamA} vs {match.teamB}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
          {hasScore ? `${match.finalScoreA} - ${match.finalScoreB}` : 'Score en attente'}
        </span>
        {dateLabel && timeLabel ? (
          <span className="text-xs text-slate-500">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} • {timeLabel}
          </span>
        ) : null}
      </div>
    </section>
  );
}

type WinnersPanelProps = {
  winners: Prediction[];
  totalWinners: number;
  loading: boolean;
  error: string | null;
  matchEnded: boolean;
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function WinnersPanel({
  winners,
  totalWinners,
  loading,
  error,
  matchEnded,
  searchTerm,
  onSearchChange,
}: WinnersPanelProps) {
  const searchDisabled = !matchEnded || loading || Boolean(error);
  const summaryText = (() => {
    if (!matchEnded) {
      return 'Les gagnants seront affiches apres la fin du match.';
    }
    if (loading) {
      return 'Chargement des gagnants...';
    }
    if (error) {
      return error;
    }
    if (totalWinners === 0) {
      return 'Les gagnants seront annonces prochainement.';
    }
    return totalWinners === 1
      ? '1 gagnant a trouve le bon score.'
      : `${totalWinners} gagnants ont trouve le bon score.`;
  })();

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900">Gagnants du match</h2>
        <p className="text-xs text-slate-500">{summaryText}</p>
      </header>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          type="search"
          value={searchTerm}
          onChange={onSearchChange}
          disabled={searchDisabled}
          placeholder="Rechercher un gagnant"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
      <div className="flex flex-col gap-3">
        {loading ? (
          <WinnersSkeleton />
        ) : error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-600">{error}</p>
        ) : !matchEnded ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
            Les gagnants seront affiches ici quand le match sera termine.
          </p>
        ) : totalWinners === 0 ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
            Les gagnants seront annonces prochainement.
          </p>
        ) : winners.length === 0 ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
            Aucun gagnant ne correspond a cette recherche.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {winners.map((winner, index) => (
              <WinnerListItem key={winner.id} winner={winner} position={index + 1} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

type WinnerListItemProps = {
  winner: Prediction;
  position: number;
};

function WinnerListItem({ winner, position }: WinnerListItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-600">
        {position}
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold text-slate-900">{winner.userName}</span>
        <span className="text-xs text-slate-500">
          Score : {winner.scoreA} - {winner.scoreB}
        </span>
      </div>
    </li>
  );
}

function WinnersSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="17" y2="17" />
    </svg>
  );
}
