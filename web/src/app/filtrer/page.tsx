'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROM_OPTIONS = ['32', '64', '128', '256', '512'];
const RAM_OPTIONS = ['2', '4', '6', '8', '12'];

export type FilterState = {
  minPrice: string;
  maxPrice: string;
  rom: string;
  ram: string;
};

const DEFAULT_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  rom: '',
  ram: '',
};

export default function FiltrerPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `${Number(filters.minPrice).toLocaleString('fr-FR')} F` : '0';
      const max = filters.maxPrice ? `${Number(filters.maxPrice).toLocaleString('fr-FR')} F` : 'illimite';
      chips.push({
        key: 'price',
        label: `${min} - ${max}`,
        onRemove: () => setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' })),
      });
    }

    if (filters.rom) {
      chips.push({
        key: 'rom',
        label: `${filters.rom} Go ROM`,
        onRemove: () => setFilters(prev => ({ ...prev, rom: '' })),
      });
    }

    if (filters.ram) {
      chips.push({
        key: 'ram',
        label: `${filters.ram} Go RAM`,
        onRemove: () => setFilters(prev => ({ ...prev, ram: '' })),
      });
    }

    return chips;
  }, [filters]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();

      if (filters.minPrice) {
        params.set('minPrice', filters.minPrice);
      }
      if (filters.maxPrice) {
        params.set('maxPrice', filters.maxPrice);
      }
      if (filters.rom) {
        params.set('rom', filters.rom);
      }
      if (filters.ram) {
        params.set('ram', filters.ram);
      }

      const queryString = params.toString();
      router.push(queryString ? `/filtrer/resultats?${queryString}` : '/filtrer/resultats');
    },
    [filters, router]
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catalogue</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Filtres avances</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
            >
              Reinitialiser
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Fermer les filtres"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 shadow-sm"
        >
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Criteres actifs</p>
                <p className="text-sm font-semibold text-slate-900">
                  {activeChips.length > 0 ? `${activeChips.length} filtre(s) en cours` : 'Aucun filtre applique'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeChips.length === 0 ? (
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                    Aucun critere selectionne
                  </span>
                ) : (
                  activeChips.map(chip => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-400"
                    >
                      {chip.label} <span aria-hidden>x</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <BudgetSection filters={filters} setFilters={setFilters} />
          <CapacitySection filters={filters} setFilters={setFilters} />

          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          >
            Voir les resultats
          </button>
        </form>
      </main>
    </div>
  );
}

function BudgetSection({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Budget</h2>
        <p className="text-xs text-slate-500">Indiquez un intervalle en FCFA.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <label htmlFor="minPrice" className="text-xs font-medium text-slate-500">
            Min
          </label>
          <input
            id="minPrice"
            type="number"
            min={0}
            step={1000}
            value={filters.minPrice}
            onChange={event => setFilters(prev => ({ ...prev, minPrice: event.target.value }))}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="maxPrice" className="text-xs font-medium text-slate-500">
            Max
          </label>
          <input
            id="maxPrice"
            type="number"
            min={0}
            step={1000}
            value={filters.maxPrice}
            onChange={event => setFilters(prev => ({ ...prev, maxPrice: event.target.value }))}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
      </div>
    </section>
  );
}

function CapacitySection({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Capacites</h2>
        <p className="text-xs text-slate-500">ROM et RAM souhaitees.</p>
      </header>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Stockage (ROM)</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {ROM_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, rom: prev.rom === option ? '' : option }))}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  filters.rom === option ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option} Go
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Memoire vive (RAM)</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {RAM_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, ram: prev.ram === option ? '' : option }))}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  filters.ram === option ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option} Go
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M6 6L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 6L6 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
