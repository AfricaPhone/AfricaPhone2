'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { SVGProps } from 'react';
import { usePronosticMatches } from '@/hooks/usePronosticMatches';
import type { Match } from '@/types/pronostics';

const galleryImages = [
  { src: '/pronostics/gallery/gagnant-1.jpg', alt: 'Gagnant 1 tenant son lot' },
  { src: '/pronostics/gallery/gagnant-2.jpg', alt: 'Gagnant 2 célébrant son prix' },
  { src: '/pronostics/gallery/gagnant-3.jpg', alt: 'Gagnant 3 souriant avec son lot' },
  { src: '/pronostics/gallery/gagnant-4.jpg', alt: 'Gagnant 4 recevant son cadeau' },
  { src: '/pronostics/gallery/gagnant-5.jpg', alt: 'Gagnant 5 posant après la victoire' },
  { src: '/pronostics/gallery/gagnant-6.jpg', alt: 'Gagnant 6 participant précédent' },
] as const;

type MatchStatus = 'live' | 'upcoming' | 'finished';

export default function PronosticsPage() {
  const router = useRouter();
  const { matches, loading, error } = usePronosticMatches();

  const primaryMatch = matches.length > 0 ? matches[0] : undefined;
  const matchStatus: MatchStatus = getMatchStatus(primaryMatch);
  const categoryLabel = primaryMatch?.competition ?? 'Classico';
  const teamA = primaryMatch?.teamA ?? 'Real Madrid';
  const teamB = primaryMatch?.teamB ?? 'FC Barcelona';
  const dateLabel = primaryMatch?.startTime ? formatMatchDate(primaryMatch.startTime) : 'Dimanche 26 Octobre À 16:15';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleMatchNavigate = () => {
    if (primaryMatch) {
      router.push(`/pronostics/${primaryMatch.id}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F7F9] text-[#111827]">
      <AppBar title="Choisir un Match" onBack={handleBack} />
      <main className="mx-auto w-full max-w-screen-sm px-4 pb-28 pt-4">
        <section className="flex flex-col gap-4">
          <MatchCard
            category={categoryLabel}
            teamA={teamA}
            teamB={teamB}
            dateLabel={dateLabel}
            status={matchStatus}
            loading={loading}
            error={error}
            interactive={Boolean(primaryMatch)}
            onSelect={handleMatchNavigate}
          />
          <WinnersGallery images={galleryImages} />
        </section>
      </main>
    </div>
  );
}

type MatchCardProps = {
  category: string;
  teamA: string;
  teamB: string;
  dateLabel: string;
  status: MatchStatus;
  loading: boolean;
  error: string | null;
  interactive: boolean;
  onSelect: () => void;
};

function MatchCard({ category, teamA, teamB, dateLabel, status, loading, error, interactive, onSelect }: MatchCardProps) {
  if (loading) {
    return (
      <article className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.08)]">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-slate-200/80" />
            <div className="h-6 w-20 rounded-full bg-slate-200/80" />
          </div>
          <div className="h-6 w-48 rounded bg-slate-200/80" />
          <div className="h-4 w-40 rounded bg-slate-200/80" />
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.08)]">
        <p className="text-sm font-semibold text-[#FF554C]">{error}</p>
      </article>
    );
  }

  const badge = getStatusBadge(status);

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onSelect}
      className="group relative w-full rounded-2xl border border-[#E6E8EC] bg-white p-4 text-left shadow-[0_1px_2px_rgba(17,24,39,0.08)] transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-90"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-[#FEA31B]">{category}</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-white"
          style={{ backgroundColor: badge.background }}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>
      <h2 className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[21px] font-bold leading-tight">
        <span>{teamA}</span>
        <span className="text-base font-semibold text-[#6B7280]">vs</span>
        <span>{teamB}</span>
      </h2>
      <p className="mt-2 text-sm font-medium text-[#6B7280]">{dateLabel}</p>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]" aria-hidden>
        <ChevronRightIcon className="h-5 w-5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

type WinnersGalleryProps = {
  images: readonly { src: string; alt: string }[];
};

function WinnersGallery({ images }: WinnersGalleryProps) {
  return (
    <section className="rounded-2xl border border-[#E6E8EC] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF3D6] text-[#FFC24A]">
            <TrophyIcon className="h-5 w-5" />
          </span>
          <p className="text-[16px] font-semibold leading-snug">
            Les anciens gagnants
            <br />
            des precedents pronostiques
          </p>
        </div>
        <a
          href="/pronostics/photos"
          className="mt-1 text-[14px] font-semibold text-[#6B7280] underline-offset-2 transition hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
        >
          Photos recentes
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.slice(0, 6).map(image => (
          <div key={image.src} className="overflow-hidden rounded-[12px]">
            <Image
              src={image.src}
              alt={image.alt}
              width={320}
              height={320}
              sizes="(max-width: 600px) 50vw, 200px"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

type AppBarProps = {
  title: string;
  onBack: () => void;
};

function AppBar({ title, onBack }: AppBarProps) {
  return (
    <header className="sticky top-0 z-50 rounded-b-[20px] bg-white/95 shadow-[0_1px_0_0_#EDEFF2] backdrop-blur-sm">
      <div className="mx-auto grid h-14 w-full max-w-screen-sm grid-cols-[44px_1fr_44px] items-center px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#111827] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
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

function getStatusBadge(status: MatchStatus) {
  if (status === 'live') {
    return {
      label: 'En cours',
      background: '#FF554C',
      icon: <FlameIcon className="h-4 w-4 text-white" />,
    };
  }

  if (status === 'finished') {
    return {
      label: 'Terminé',
      background: '#111827',
      icon: <DotIcon className="h-2 w-2 text-white" />,
    };
  }

  return {
    label: 'À venir',
    background: '#2563EB',
    icon: <DotIcon className="h-2 w-2 text-white" />,
  };
}

function getMatchStatus(match?: Match): MatchStatus {
  if (!match) {
    return 'live';
  }

  if (typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number') {
    return 'finished';
  }

  const startTime = match.startTime.toDate().getTime();
  const now = Date.now();
  const threeHours = 3 * 60 * 60 * 1000;

  if (now < startTime - 30 * 60 * 1000) {
    return 'upcoming';
  }

  if (now > startTime + threeHours) {
    return 'finished';
  }

  return 'live';
}

function formatMatchDate(startTime: Match['startTime']) {
  const date = startTime.toDate();
  const dateText = date
    .toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .split(' ')
    .map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');

  const timeText = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateText} À ${timeText}`;
}

type IconProps = SVGProps<SVGSVGElement>;

function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function FlameIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.045 2.617a.75.75 0 011.27-.319c1.75 1.8 3.185 4.32 3.185 7.238 0 .84-.105 1.665-.305 2.462a.75.75 0 001.136.833A5.995 5.995 0 0120 16.5 5.25 5.25 0 0114.75 21h-.75a6.75 6.75 0 01-6.75-6.75c0-3.63 2.45-6.64 5.484-8.147.46-.23.662-.79.44-1.262-.558-1.176-1.25-2.182-2.06-2.976z"
      />
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

function DotIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 8 8" fill="currentColor" {...props}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}
