'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const SHOW_PRONOSTICS_CARD = false;
const FALLBACK_VOTE_IMAGE = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80';

const safeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

export default function CommunityPromotionRow() {
  const [voteImageUrl, setVoteImageUrl] = useState<string>(FALLBACK_VOTE_IMAGE);

  useEffect(() => {
    let isMounted = true;
    const fetchCoverImage = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'config', 'boutiqueInfo'));
        if (!snapshot.exists()) {
          return;
        }
        const data = snapshot.data() as { coverImageUrl?: unknown };
        const cover = safeString(data.coverImageUrl);
        if (cover && isMounted) {
          setVoteImageUrl(cover);
        }
      } catch (error) {
        console.warn('CommunityPromotionRow: unable to load boutique cover image', error);
      }
    };

    fetchCoverImage();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section aria-label="Jeux & concours AfricaPhone" className="-mx-[0.2rem] px-[0.2rem] sm:mx-0 sm:px-0">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-4 sm:overflow-visible">
        {SHOW_PRONOSTICS_CARD ? <PronosticsPromoCard /> : null}
        <VoteContestPromoCard imageUrl={voteImageUrl} />
        <AppCtaButton />
      </div>
    </section>
  );
}

function PronosticsPromoCard() {
  return (
    <article className="flex w-full flex-shrink-0 snap-center sm:w-full sm:min-w-0 sm:max-w-none">
      <Link
        href="/pronostics"
        className="group relative block h-[100px] w-full overflow-hidden rounded-[16px] shadow-md shadow-slate-900/15 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:h-[118px]"
        aria-labelledby="pronostics-promo-title"
      >
        <Image
          src="/pronostics/hero-ball.jpg"
          alt="Ballon de football sur gazon"
          fill
          priority={false}
          className="object-cover transition duration-300 group-hover:scale-[1.02] group-active:scale-[0.99] [filter:saturate(0.95)_contrast(1.05)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.18)_70%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute left-3.5 top-3 flex h-full max-h-[82px] flex-col justify-start gap-1.5 text-white sm:left-4 sm:top-3.5">
          <h2
            id="pronostics-promo-title"
            className="text-[15px] font-black leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:text-[16px]"
          >
            Pronostics Football
          </h2>
          <span
            className="inline-flex h-6 items-center justify-center rounded-full bg-white px-2.5 text-[10px] font-semibold text-[#1F2A44] shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition group-active:opacity-90 group-active:shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
            aria-hidden="true"
          >
            Jouer maintenant
          </span>
        </div>
      </Link>
    </article>
  );
}

type VoteContestPromoCardProps = {
  imageUrl: string;
};

function VoteContestPromoCard({ imageUrl }: VoteContestPromoCardProps) {
  return (
    <article className="w-[60vw] flex-shrink-0 snap-start sm:w-full">
      <Link
        href="/votes"
        className="group relative block h-[100px] w-full overflow-hidden rounded-[16px] shadow-md shadow-slate-900/15 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:h-[118px]"
        aria-labelledby="votes-promo-title"
      >
        <Image
          src={imageUrl}
          alt="Vote digital"
          fill
          priority
          className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(3,26,63,0.8)_0%,rgba(13,75,162,0.4)_50%,rgba(26,109,224,0.1)_100%)]" />
        <div className="absolute left-3.5 top-3 flex h-full max-h-[84px] flex-col justify-start gap-1.5 text-white sm:left-4 sm:top-3.5">
          <h2
            id="votes-promo-title"
            className="text-[16px] font-black uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] sm:text-[17px]"
          >
            Concours de vote
          </h2>
          <span
            className="inline-flex h-7 items-center justify-center rounded-full bg-white px-3.5 text-[12px] font-semibold text-[#1F2A44] shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition group-active:opacity-90 group-active:shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            aria-hidden="true"
          >
            Voter maintenant
          </span>
        </div>
      </Link>
    </article>
  );
}

function AppCtaButton() {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.africaphone.africaphone"
      target="_blank"
      rel="noreferrer"
      className="group relative flex h-[100px] w-[75vw] flex-shrink-0 snap-start overflow-hidden rounded-[16px] border border-slate-200 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-3 shadow-md shadow-slate-900/15 transition-all hover:shadow-lg hover:shadow-blue-500/15 sm:h-[118px] sm:w-full"
    >
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 blur-xl" />
      <div className="absolute -bottom-3 -left-3 h-16 w-16 rounded-full bg-gradient-to-tr from-blue-500/20 to-cyan-500/10 blur-lg" />

      {/* Content - now on the left */}
      <div className="relative flex flex-1 flex-col justify-center gap-1">
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
            Nouveau
          </span>
        </div>
        <h3 className="text-[11px] font-bold leading-tight text-white">
          Télécharger l&apos;app AfricaPhone
        </h3>

        {/* Google Play badge */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 backdrop-blur-sm transition-all group-hover:bg-white/20">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
            </svg>
            <span className="text-[9px] font-bold text-white">Google Play</span>
          </div>
          <svg className="h-3 w-3 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Phone mockup - now on the right */}
      <div className="relative ml-3 flex h-14 w-9 flex-shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg">
          <div className="absolute inset-[2px] rounded-[6px] bg-gradient-to-b from-slate-900 to-black">
            <div className="absolute left-1/2 top-0.5 h-0.5 w-3 -translate-x-1/2 rounded-full bg-slate-700" />
            <div className="absolute inset-0.5 top-2 rounded-md bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 opacity-90" />
          </div>
        </div>
        {/* Notification badge */}
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-lg animate-pulse">
          1
        </div>
      </div>
    </a>
  );
}
