'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useId, useState } from 'react';
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

const SUGGESTED_QUERIES = [
  'Tecno Camon 30',
  'Samsung Galaxy',
  'iPhone 15',
  'AirPods',
  'Accessoires',
  'Tablettes Android',
] as const;

export function TopNav({ searchQuery, onSubmitSearch }: TopNavProps) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState(searchQuery);
  const router = useRouter();
  const searchModalId = useId();

  useEffect(() => {
    if (!isSearchOpen) {
      setModalQuery(searchQuery);
    }
  }, [isSearchOpen, searchQuery]);

  const triggerSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      onSubmitSearch(trimmed);
      setModalQuery(trimmed);
      setSearchOpen(false);
    },
    [onSubmitSearch]
  );

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

  const handleOpenSearch = useCallback(() => {
    setModalQuery(searchQuery);
    setSearchOpen(true);
  }, [searchQuery]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleModalQueryChange = useCallback((value: string) => {
    setModalQuery(value);
  }, []);

  const handleModalSubmit = useCallback(() => {
    triggerSearch(modalQuery);
  }, [modalQuery, triggerSearch]);

  const handleSuggestionSelect = useCallback(
    (value: string) => {
      triggerSearch(value);
    },
    [triggerSearch]
  );

  const displayQuery = searchQuery.trim();
  const hasActiveQuery = displayQuery.length > 0;

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
          className="inline-flex shrink-0 items-center justify-center text-slate-600 transition hover:text-slate-900"
          aria-label="Partager AfricaPhone"
        >
          <ShareIcon className="h-5 w-5" />
        </button>

        <div className="flex-[1_1_140px]">
          <button
            type="button"
            onClick={handleOpenSearch}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-left text-xs font-medium text-slate-500 transition hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            aria-controls={searchModalId}
          >
            <span className={hasActiveQuery ? 'truncate text-slate-900' : 'truncate'}>
              {hasActiveQuery ? displayQuery : 'Rechercher un produit'}
            </span>
            <span className="text-[0.625rem] uppercase tracking-wide text-slate-400">Ouvrir</span>
          </button>
        </div>

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
      <SearchModal
        open={isSearchOpen}
        modalId={searchModalId}
        query={modalQuery}
        suggestions={SUGGESTED_QUERIES}
        onClose={handleCloseSearch}
        onQueryChange={handleModalQueryChange}
        onSubmit={handleModalSubmit}
        onSelectSuggestion={handleSuggestionSelect}
      />
    </div>
  );
}

export const TopBar = TopNav;

type SearchModalProps = {
  open: boolean;
  modalId: string;
  query: string;
  suggestions: readonly string[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onSelectSuggestion: (value: string) => void;
};

function SearchModal({
  open,
  modalId,
  query,
  suggestions,
  onClose,
  onQueryChange,
  onSubmit,
  onSelectSuggestion,
}: SearchModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const titleId = `${modalId}-title`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div
      id={modalId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] flex h-full w-full flex-col bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-6 sm:px-6 sm:pb-4">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Recherche dans le catalogue
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
          aria-label="Fermer la fenêtre de recherche"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Recherche catalogue"
        className="flex h-full flex-1 flex-col"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex h-12 items-center rounded-full border border-slate-300 bg-slate-50 px-4">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
              placeholder="Rechercher un produit ou une marque"
              className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="Saisir une recherche produit"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Suggestions de recherche">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60"
          >
            Rechercher
          </button>
        </div>
      </form>
    </div>
  );
}

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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
