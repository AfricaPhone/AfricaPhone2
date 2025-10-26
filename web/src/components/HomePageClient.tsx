'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductGridSection from '@/components/ProductGridSection';
import { footerColumns, footerLegal } from '@/data/storefront';

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
      <Footer />
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
        <div className="flex h-11 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-900 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
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
            className="flex h-full w-11 items-center justify-center bg-orange-500 text-white transition hover:bg-orange-600"
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

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-12 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center lg:max-w-none lg:flex-1 lg:items-start lg:text-left">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-2xl font-bold text-white lg:justify-start"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg text-slate-900">
              AP
            </span>
            Africa<span className="text-orange-400">Phone</span>
          </Link>
          <p className="text-sm text-slate-400">
            Catalogues verifies, stocks physiques et experts passionnes pour vous accompagner avant et apres votre achat.
          </p>
          <a
            href="tel:+2290154151522"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-orange-200"
          >
            <PhoneIcon className="h-5 w-5" />
            01 54 15 15 22
          </a>
        </div>
        <div className="grid w-full gap-8 sm:grid-cols-2 lg:flex-1 lg:grid-cols-3">
          {footerColumns.map(column => (
            <div key={column.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{column.title}</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {column.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-orange-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between lg:px-8">
          <span>&copy; {new Date().getFullYear()} AfricaPhone. Tous droits reserves.</span>
          <div className="flex flex-wrap justify-center gap-4">
            {footerLegal.map(item => (
              <Link key={item.label} href={item.href} className="hover:text-orange-200">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

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

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.32 2H7.5a2 2 0 0 1 2 1.72 12.3 12.3 0 0 0 .67 2.71 2 2 0 0 1-.45 2.11l-1.07 1.07a16 16 0 0 0 6 6l1.07-1.07a2 2 0 0 1 2.11-.45 12.3 12.3 0 0 0 2.71.67A2 2 0 0 1 22 16.92Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
