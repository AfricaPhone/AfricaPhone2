'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
        <ProductGridSection searchQuery={searchQuery} />
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

      <form
        className="order-3 w-full min-w-[220px] flex-1 sm:order-none sm:max-w-xl"
        onSubmit={handleSubmit}
        role="search"
        aria-label="Recherche catalogue"
      >
        <div className="flex h-11 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-900 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200">
          <input
            type="search"
            placeholder="Rechercher un produit, une marque ou un service AfricaPhone"
            className="h-full flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-400"
            value={localQuery}
            onChange={handleInputChange}
            aria-label="Champ de recherche"
          />
          <button
            type="submit"
            className="flex h-full w-11 items-center justify-center bg-slate-900 text-white transition hover:bg-slate-800"
            aria-label="Rechercher"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.5 15.417c3.25 0 5.917-2.667 5.917-5.917C15.417 6.25 12.75 3.583 9.5 3.583 6.25 3.583 3.583 6.25 3.583 9.5 3.583 12.75 6.25 15.417 9.5 15.417Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.167 14.167 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
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

