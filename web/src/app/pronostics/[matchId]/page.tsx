'use client';

import { useRouter } from 'next/navigation';
import PredictionDetailPanel from '@/components/pronostics/PredictionDetailPanel';
import { usePronosticMatchInsights } from '@/hooks/usePronosticMatchInsights';

type PageProps = {
  params: {
    matchId: string;
  };
};

export default function PronosticMatchDetailPage({ params }: PageProps) {
  const router = useRouter();
  const matchId = params.matchId ?? null;
  const insights = usePronosticMatchInsights(matchId);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/pronostics');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <AppBar title="Pronostics Football - Africaphone" onBack={handleBack} />
      <main className="mx-auto w-full max-w-screen-sm px-4 pb-16 pt-4">
        <PredictionDetailPanel
          match={insights.match}
          loading={insights.loadingMatch}
          error={insights.errorMatch}
          winners={insights.winners}
          loadingWinners={insights.loadingWinners}
          errorWinners={insights.errorWinners}
        />
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

type IconProps = React.SVGProps<SVGSVGElement>;

function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
