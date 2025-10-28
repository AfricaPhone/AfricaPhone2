'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductGridSection from '@/components/ProductGridSection';
import BrandsCarousel from '@/components/BrandsCarousel';
import { footerColumns, footerLegal } from '@/data/storefront';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = useCallback((term: string) => {
    setSearchQuery(term.trim());
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header searchQuery={searchQuery} onSubmitSearch={handleSearchSubmit} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-[0.2rem] pb-16 pt-4 sm:px-4 lg:px-8">
        <BrandsCarousel />
        <CommunityPromotionRow />
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
        <span>
          Africa<span className="text-orange-400">Phone</span>
        </span>
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

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <a
          href="tel:+2290154151522"
          className="flex items-center gap-2 rounded-full border border-transparent bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-900 hover:bg-white hover:text-slate-900"
        >
          <PhoneIcon className="h-4 w-4" />
          <span className="hidden sm:inline">01 54 15 15 22</span>
        </a>
        <Link
          href="#cart"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-orange-400 hover:text-orange-500"
        >
          <CartIcon className="h-5 w-5 text-orange-500" />
          <span className="hidden sm:inline">Panier</span>
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">0</span>
        </Link>
      </div>
    </div>
  );
}

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
            Catalogues verifies, stocks physiques et experts passionnes pour vous accompagner avant et apres votre
            achat.
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

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5.5 6h-.75c-.62 0-1.12.5-1.12 1.12v.01c0 .62.5 1.12 1.12 1.12h.96l2.02 8.44a1.12 1.12 0 0 0 1.09.85h8.11a1.12 1.12 0 0 0 1.07-.79l2.11-6.77a.56.56 0 0 0-.54-.72H8.84"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 21Z" fill="currentColor" />
      <path d="M17 21a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 17 21Z" fill="currentColor" />
    </svg>
  );
}

function CommunityPromotionRow() {
  return (
    <section aria-label="Jeux & concours AfricaPhone" className="-mx-[0.2rem] px-[0.2rem] sm:mx-0 sm:px-0">
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
        <PronosticsPromoCard />
        <VoteContestPromoCard />
      </div>
    </section>
  );
}

function PronosticsPromoCard() {
  return (
    <article className="flex min-w-[78vw] max-w-[420px] flex-shrink-0 snap-center sm:min-w-0 sm:max-w-none">
      <Link
        href="/pronostics"
        className="group relative block h-[176px] w-full overflow-hidden rounded-[24px] shadow-lg shadow-slate-900/25 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:h-[184px]"
        aria-labelledby="pronostics-promo-title"
      >
        <Image
          src="/pronostics/hero-ball.jpg"
          alt="Ballon de football sur gazon"
          fill
          priority={false}
          className="object-cover transition duration-300 group-hover:scale-[1.02] group-active:scale-[0.99] [filter:saturate(0.95)_contrast(1.05)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.1)_60%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute left-5 top-5 flex h-full max-h-[136px] flex-col justify-start gap-4 text-white sm:left-6 sm:top-6">
          <h2
            id="pronostics-promo-title"
            className="text-[22px] font-black leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:text-[24px]"
          >
            Pronostics Football
          </h2>
          <span
            className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-[15px] font-semibold text-[#1F2A44] shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition group-active:opacity-90 group-active:shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
            aria-hidden="true"
          >
            Jouer maintenant
          </span>
        </div>
      </Link>
    </article>
  );
}

function VoteContestPromoCard() {
  return (
    <article className="flex min-w-[78vw] max-w-[420px] flex-shrink-0 snap-center sm:min-w-0 sm:max-w-none">
      <Link
        href="/votes"
        className="group relative block h-[176px] w-full overflow-hidden rounded-[24px] shadow-lg shadow-slate-900/25 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:h-[184px]"
        aria-labelledby="votes-promo-title"
      >
        <Image
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"
          alt="Public applaudissant un concours"
          fill
          priority={false}
          className="object-cover transition duration-300 group-hover:scale-[1.02] group-active:scale-[0.99]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute left-5 top-5 flex h-full max-h-[140px] flex-col justify-start gap-3 text-white sm:left-6 sm:top-6">
          <span className="inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
            Concours de vote
          </span>
          <h2
            id="votes-promo-title"
            className="text-[22px] font-black leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:text-[24px]"
          >
            AfricaPhone Awards
          </h2>
          <span
            className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-[15px] font-semibold text-[#1F2A44] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition group-active:opacity-90 group-active:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            aria-hidden="true"
          >
            Voter maintenant
          </span>
        </div>
      </Link>
    </article>
  );
}
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75v10.5A2.25 2.25 0 0 1 15.75 19.5h-7.5A2.25 2.25 0 0 1 6 17.25V6.75A2.25 2.25 0 0 1 8.25 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 7.5h6M9 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14.25a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" fill="currentColor" />
    </svg>
  );
}

