'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductGridSection from '@/components/ProductGridSection';
import SiteFooter from '@/components/SiteFooter';

export default function HomePageClient() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = useCallback((term: string) => {
    setSearchQuery(term.trim());
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Header searchQuery={searchQuery} onSubmitSearch={handleSearchSubmit} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 overflow-x-hidden px-[0.2rem] pb-16 pt-4 sm:px-4 lg:px-8">
        <ProductGridSection searchQuery={searchQuery} enableStaticFallbacks={false} />
      </main>
      <SiteFooter />
    </div>
  );
}

type HeaderProps = {
  searchQuery: string;
  onSubmitSearch: (term: string) => void;
};

export function Header({ searchQuery, onSubmitSearch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white text-slate-900 shadow-sm shadow-slate-900/10">
      <TopNav searchQuery={searchQuery} onSubmitSearch={onSubmitSearch} />
    </header>
  );
}

type TopNavProps = {
  searchQuery: string;
  onSubmitSearch: (term: string) => void;
};

export function TopNav({ searchQuery, onSubmitSearch }: TopNavProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const router = useRouter();

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedValue = localQuery.trim();
      onSubmitSearch(trimmedValue);
      setLocalQuery(trimmedValue);
    },
    [localQuery, onSubmitSearch]
  );

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(event.target.value);
  }, []);

  const handleFilterClick = useCallback(() => {
    router.push('/filtrer');
  }, [router]);

  const handleShareClick = useCallback(async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://africaphone.com';
    const shareTitle = 'AfricaPhone';
    const shareText = 'Decouvrez la boutique AfricaPhone et nos offres mobiles.';

    if (typeof navigator !== 'undefined') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
          return;
        } catch (error) {
          const abortError = error instanceof Error && error.name === 'AbortError';
          if (!abortError) {
            console.error('TopNav: web share failed', error);
          }
        }
      }

      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          return;
        } catch (error) {
          console.error('TopNav: clipboard copy failed', error);
        }
      }
    }

    const fallbackUrl = `https://wa.me/22954151522?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    if (typeof window !== 'undefined') {
      window.open(fallbackUrl, '_blank');
    }
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 lg:px-8">
      <Link
        href="/"
        className="flex items-center gap-2 whitespace-nowrap text-xl font-extrabold tracking-tight text-slate-900"
      >
        <Image
          src="/logo.png"
          alt="Logo AfricaPhone"
          width={40}
          height={40}
          priority
          className="h-10 w-10 rounded-lg shadow-sm shadow-orange-500/30"
        />
        <span>AfricaPhone</span>
      </Link>

      <div className="order-3 flex w-full flex-nowrap items-center gap-2 sm:order-none">
        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          aria-label="Partager AfricaPhone"
        >
          <ShareIcon className="h-5 w-5" />
          Partager
        </button>

        <form
          className="flex-[1_1_140px]"
          onSubmit={handleSubmit}
          role="search"
          aria-label="Recherche catalogue"
        >
          <div className="flex h-11 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-900 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200">
            <input
              type="search"
              placeholder="Rechercher un produit"
              className="h-full flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-slate-400"
              value={localQuery}
              onChange={handleInputChange}
              aria-label="Champ de recherche"
            />
            <button
              type="submit"
              className="inline-flex h-full items-center justify-center whitespace-nowrap bg-slate-900 px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
              aria-label="Rechercher"
            >
              Rechercher
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={handleFilterClick}
          className="inline-flex shrink-0 h-11 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          aria-label="Ouvrir les filtres"
        >
          Filtrer
        </button>
      </div>

      <div className="ml-auto">
        <Link
          href="/nous-trouver"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <LocatorIcon className="h-4 w-4" />
          Ou nous trouver
        </Link>
      </div>
    </div>
  );
}

export const TopBar = TopNav;

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M17.5 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM6.5 14.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM17.5 20.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.43 11.72 15.57 7.03M8.43 12.28l7.14 4.69"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocatorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}





