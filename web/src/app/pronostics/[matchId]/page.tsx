'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { SVGProps } from 'react';
import { usePronosticMatchInsights } from '@/hooks/usePronosticMatchInsights';
import type { Match } from '@/types/pronostics';

type PageProps = {
  params: {
    matchId: string;
  };
};

export default function PronosticMatchDetailPage({ params }: PageProps) {
  const router = useRouter();
  const matchId = params.matchId;
  const { match, loadingMatch, errorMatch } = usePronosticMatchInsights(matchId ?? null);

  const participantCount = match?.predictionCount && match.predictionCount > 0 ? match.predictionCount : 27;
  const trends = useMemo(() => computeTrends(match, participantCount), [match, participantCount]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/pronostics');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <AppBar title="Pronostics Football – Africaphone" onBack={handleBack} />
      <main className="mx-auto w-full max-w-screen-sm px-4 pb-16 pt-4">
        {loadingMatch ? (
          <DetailSkeleton />
        ) : errorMatch ? (
          <ErrorState message={errorMatch} />
        ) : !match ? (
          <ErrorState message="Match introuvable." />
        ) : (
          <div className="flex flex-col gap-4">
            <MatchSummaryCard match={match} />
            <StatusButton />
            <TrendsCard trends={trends} participantCount={participantCount} />
          </div>
        )}
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
        <div aria-hidden className="h-11 w-11" />
      </div>
    </header>
  );
}

type MatchSummaryCardProps = {
  match: Match;
};

function MatchSummaryCard({ match }: MatchSummaryCardProps) {
  const competition = match.competition || 'Classico';
  const dateLabel = formatMatchDate(match.startTime);

  return (
    <article className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF3E6] px-3 py-1 text-[13px] font-semibold uppercase tracking-wide text-[#FF8A1E]">
          <TrophyIcon className="h-4 w-4" /> {competition}
        </span>
        <span className="text-sm font-medium text-[#6B7280]">{dateLabel}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <TeamColumn name={match.teamA} logo={match.teamALogo} side="left" />
        <div className="text-base font-semibold uppercase tracking-wide text-[#6B7280]">vs</div>
        <TeamColumn name={match.teamB} logo={match.teamBLogo} side="right" />
      </div>
    </article>
  );
}

type TeamColumnProps = {
  name: string;
  logo?: string | null;
  side: 'left' | 'right';
};

function TeamColumn({ name, logo, side }: TeamColumnProps) {
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#E6E8EC] bg-white shadow-sm">
        {logo ? (
          <Image src={logo} alt={name} width={64} height={64} className="h-full w-full object-contain" />
        ) : (
          <span className="text-lg font-semibold text-[#6B7280]">{getInitials(name)}</span>
        )}
      </div>
      <span className="text-[16px] font-semibold leading-tight">{name}</span>
    </div>
  );
}

function StatusButton() {
  return (
    <button
      type="button"
      disabled
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#9AA3AF] px-4 text-[15px] font-semibold text-white opacity-95"
    >
      <span aria-hidden className="text-base leading-none">
        <LockIcon className="h-4 w-4" />
      </span>
      Pronostics terminés
    </button>
  );
}

type TrendItem = {
  score: string;
  count: number;
  percentage: number;
};

type TrendsCardProps = {
  trends: TrendItem[];
  participantCount: number;
};

function TrendsCard({ trends, participantCount }: TrendsCardProps) {
  return (
    <section className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[16px] font-semibold">Tendances des pronostics</h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF1FF] px-3 py-1 text-[13px] font-semibold text-[#2B6DE9]">
          <span aria-hidden>👥</span>
          {participantCount} participants
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {trends.map(trend => (
          <li key={trend.score} className="grid grid-cols-[54px_1fr_auto] items-center gap-3 text-sm">
            <span className="font-mono font-semibold text-[#111827]">{trend.score}</span>
            <div className="h-2 rounded-full bg-[#EEF1F5]">
              <div
                className="h-2 rounded-full bg-[#FF8A1E]"
                style={{ width: `${Math.min(Math.max(trend.percentage, 6), 100)}%` }}
                aria-hidden
              />
            </div>
            <span className="text-[14px] font-medium text-[#6B7280]">
              {trend.percentage}% ({trend.count})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="animate-pulse space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-32 rounded-full bg-slate-200/80" />
            <div className="h-4 w-28 rounded-full bg-slate-200/80" />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-slate-200/80" />
              <div className="h-4 w-20 rounded bg-slate-200/80" />
            </div>
            <div className="h-4 w-12 rounded bg-slate-200/80" />
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-slate-200/80" />
              <div className="h-4 w-20 rounded bg-slate-200/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="h-12 rounded-[14px] bg-slate-200/80" />
      <div className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded bg-slate-200/80" />
            <div className="h-5 w-28 rounded-full bg-slate-200/80" />
          </div>
          {[...Array(4).keys()].map(index => (
            <div key={index} className="grid grid-cols-[54px_1fr_auto] items-center gap-3">
              <div className="h-4 w-12 rounded bg-slate-200/80" />
              <div className="h-2 rounded-full bg-slate-200/80" />
              <div className="h-4 w-16 rounded bg-slate-200/80" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ErrorStateProps = {
  message: string;
};

function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm font-medium text-[#B91C1C]">
      {message}
    </div>
  );
}

function computeTrends(match: Match | null | undefined, participantCount: number): TrendItem[] {
  const fallback: TrendItem[] = [
    { score: '2-1', count: 4, percentage: 15 },
    { score: '3-2', count: 3, percentage: 11 },
    { score: '3-1', count: 3, percentage: 11 },
    { score: '2-4', count: 2, percentage: 7 },
    { score: '1-0', count: 2, percentage: 7 },
    { score: '2-2', count: 2, percentage: 7 },
  ];

  if (!match?.trends || Object.keys(match.trends).length === 0) {
    return fallback;
  }

  const entries = Object.entries(match.trends).filter(([, count]) => typeof count === 'number' && count > 0);
  if (entries.length === 0) {
    return fallback;
  }

  const total = participantCount > 0 ? participantCount : entries.reduce((sum, [, count]) => sum + count, 0);
  if (total <= 0) {
    return fallback;
  }

  return entries
    .map(([score, count]) => {
      const percentage = Math.round((count / total) * 100);
      return {
        score,
        count,
        percentage: Math.min(Math.max(percentage, 1), 100),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function formatMatchDate(startTime: Match['startTime']) {
  const date = startTime.toDate();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} – ${hours}:${minutes}`;
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

type IconProps = SVGProps<SVGSVGElement>;

function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function TrophyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 01-5 5 5 5 0 01-5-5z" />
      <path d="M18 4h3v2a5 5 0 01-5 5" />
      <path d="M6 4H3v2a5 5 0 005 5" />
    </svg>
  );
}

function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}
