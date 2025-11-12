'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchContestSettings } from '@/services/contestSettings';
import type { ContestPhase } from '@/types/contest';

const DEFAULT_VOTE_URL = 'https://africaphone-contest-form.web.app/votes';
const BADGE_COLORS: Record<ContestPhase, string> = {
  registration: 'bg-amber-500/10 text-amber-200 border border-amber-400/40',
  voting: 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/40',
  results: 'bg-blue-500/10 text-blue-200 border border-blue-400/40',
  closed: 'bg-slate-500/10 text-slate-200 border border-slate-400/40',
};

type BannerState = {
  status: 'loading' | 'ready' | 'error';
  phase: ContestPhase;
  isOpen: boolean;
  sitePublicUrl?: string;
  contestId?: string;
};

const initialState: BannerState = {
  status: 'loading',
  phase: 'registration',
  isOpen: false,
};

const copyByPhase: Record<
  ContestPhase,
  {
    title: string;
    description: string;
    highlight: string;
    showVoteCta: boolean;
  }
> = {
  registration: {
    title: 'Phase d’inscription en cours',
    description: 'Les journalistes soumettent encore leurs dossiers. Revenez bientôt pour soutenir votre favorite.',
    highlight: 'Inscriptions en cours',
    showVoteCta: false,
  },
  voting: {
    title: 'Les votes sont ouverts',
    description: 'Consultez les profils et attribuez vos votes en temps réel pour faire gagner votre candidate.',
    highlight: 'Votes ouverts',
    showVoteCta: true,
  },
  results: {
    title: 'Résultats en préparation',
    description: 'Les votes sont clos. Les résultats officiels seront annoncés d’ici peu.',
    highlight: 'Résultats en cours',
    showVoteCta: false,
  },
  closed: {
    title: 'Concours terminé',
    description: 'Le concours est terminé pour cette édition. Suivez nos réseaux pour connaître la prochaine session.',
    highlight: 'Session cloturée',
    showVoteCta: false,
  },
};

export default function ContestPhaseBanner() {
  const [state, setState] = useState<BannerState>(initialState);

  useEffect(() => {
    let isMounted = true;
    fetchContestSettings()
      .then(settings => {
        if (!isMounted) {
          return;
        }
        setState({
          status: 'ready',
          phase: settings.phase,
          isOpen: settings.isOpen,
          sitePublicUrl: settings.sitePublicUrl,
          contestId: settings.contestId,
        });
      })
      .catch(error => {
        console.warn('ContestPhaseBanner: unable to load contest settings', error);
        if (isMounted) {
          setState(prev => ({ ...prev, status: 'error' }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const phaseCopy = copyByPhase[state.phase];
  const badgeClassName = BADGE_COLORS[state.phase];
  const contestLabel = state.contestId ? `Concours ${state.contestId}` : 'Concours AfricaPhone Awards';
  const voteUrl = state.sitePublicUrl || DEFAULT_VOTE_URL;

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-900/95 p-6 text-white shadow-lg shadow-slate-900/10 sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
            {contestLabel}
          </span>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold sm:text-2xl">{phaseCopy.title}</h2>
            <p className="text-sm text-slate-200 sm:text-base">{phaseCopy.description}</p>
            {state.status === 'error' ? (
              <p className="text-xs text-rose-200">
                Impossible de récupérer l’état du concours pour le moment. Affichage de l’état par défaut.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            {phaseCopy.highlight}
          </span>
          {phaseCopy.showVoteCta ? (
            <Link
              href={voteUrl}
              rel="noreferrer"
              target={voteUrl.startsWith('http') ? '_blank' : undefined}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Voter maintenant
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/70"
            >
              Inscriptions en cours
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
