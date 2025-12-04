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
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:overflow-visible">
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
    <article className="flex w-full flex-shrink-0 snap-center sm:w-full sm:min-w-0 sm:max-w-none">
      <Link
        href="/votes"
        className="group relative block h-[100px] w-full overflow-hidden rounded-[16px] shadow-md shadow-slate-900/15 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:h-[118px]"
        aria-labelledby="votes-promo-title"
      >
        <Image
          src={imageUrl}
          alt="Vote digital"
          fill
          priority={false}
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
    <div className="flex w-full flex-shrink-0 snap-center sm:w-auto sm:justify-end">
      <Link
        href="https://play.google.com/store/apps/details?id=com.africaphone.africaphone"
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center rounded-[16px] bg-amber-400 px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-[#111827] shadow-md shadow-slate-900/15 transition hover:-translate-y-[1px] hover:bg-amber-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:w-auto sm:px-5"
      >
        Accéder à l’application
      </Link>
    </div>
  );
}
