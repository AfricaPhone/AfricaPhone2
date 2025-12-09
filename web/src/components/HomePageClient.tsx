'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CommunityPromotionRow from '@/components/CommunityPromotionRow';
import MaintenanceBanner from '@/components/MaintenanceBanner';
import ProductGridSection from '@/components/ProductGridSection';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import SiteFooter from '@/components/SiteFooter';
import { formatPrice } from '@/utils/formatPrice';
import {
  ALGOLIA_INDEX_NAME,
  algoliaClient,
  MIN_ALGOLIA_TERM_LENGTH,
  type AlgoliaProductHit,
} from '@/lib/algoliaClient';

// Set to true to show maintenance banner
const MAINTENANCE_MODE = true;

export default function HomePageClient() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = useCallback((term: string) => {
    setSearchQuery(term.trim());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  if (MAINTENANCE_MODE) {
    return <MaintenanceBanner />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Header searchQuery={searchQuery} onSubmitSearch={handleSearchSubmit} onClearSearch={handleClearSearch} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 overflow-x-hidden px-[0.2rem] pb-16 pt-4 sm:px-4 lg:px-8">
        <CommunityPromotionRow />
        <ProductGridSection enableStaticFallbacks={false} />
      </main>
      <SiteFooter />
      <ScrollToTopButton />
    </div>
  );
}

type HeaderProps = {
  searchQuery: string;
  onSubmitSearch: (term: string) => void;
  onClearSearch: () => void;
};

export function Header({ searchQuery, onSubmitSearch, onClearSearch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white text-slate-900 shadow-sm shadow-slate-900/10">
      <TopNav searchQuery={searchQuery} onSubmitSearch={onSubmitSearch} onClearSearch={onClearSearch} />
    </header>
  );
}

type TopNavProps = {
  searchQuery: string;
  onSubmitSearch: (term: string) => void;
  onClearSearch: () => void;
};

const SUGGESTED_QUERIES = [
  'Tecno Camon 30',
  'Samsung Galaxy',
  'iPhone 15',
  'AirPods',
  'Accessoires',
  'Tablettes Android',
] as const;

export function TopNav({ searchQuery, onSubmitSearch, onClearSearch }: TopNavProps) {
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
      onClearSearch();
    },
    [onClearSearch, onSubmitSearch]
  );

  const handleFilterClick = useCallback(() => {
    router.push('/filtrer');
  }, [router]);

  const handleShareClick = useCallback(async () => {
    const shareUrl = 'https://africaphone-org.web.app';
    const shareTitle = 'AfricaPhone';
    const shareText = 'Decouvrez la boutique AfricaPhone et nos offres mobiles.';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('TopNav: web share failed', error);
      }
    }

    if (typeof window !== 'undefined') {
      window.alert('Partage indisponible sur votre appareil. Copiez le lien https://africaphone-org.web.app manuellement.');
    }
  }, []);

  const handleOpenSearch = useCallback(() => {
    setModalQuery(searchQuery);
    setSearchOpen(true);
  }, [searchQuery]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setModalQuery('');
    onClearSearch();
  }, [onClearSearch]);

  const handleModalQueryChange = useCallback((value: string) => {
    setModalQuery(value);
  }, []);

  const handleModalSubmit = useCallback(() => {
    triggerSearch(modalQuery);
  }, [modalQuery, triggerSearch]);

  const handleSuggestionSelect = useCallback(
    (value: string, options?: { id?: string }) => {
      if (options?.id) {
        onClearSearch();
        router.push(`/produits/${options.id}`);
        return;
      }
      triggerSearch(value);
    },
    [onClearSearch, router, triggerSearch]
  );

  const displayQuery = searchQuery.trim();
  const hasActiveQuery = displayQuery.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:gap-4 lg:px-8">
      <div className="flex w-full items-center gap-3">
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
        <div className="ml-auto">
          <Link
            href="/nous-trouver"
            className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            <MapPinIcon className="h-6 w-6 text-red-500" />
            Où nous trouver ?
          </Link>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex shrink-0 items-center justify-center text-[#111111] transition hover:text-[#0f172a]"
          aria-label="Partager AfricaPhone"
        >
          <ShareIcon className="h-9 w-9" />
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

      <SearchModal
        open={isSearchOpen}
        modalId={searchModalId}
        query={modalQuery}
        fallbackSuggestions={SUGGESTED_QUERIES}
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
  fallbackSuggestions: readonly string[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onSelectSuggestion: (value: string, opts?: { id?: string }) => void;
};

type SearchResult = {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  image: string | null;
  rom: number | null;
  ram: number | null;
  description: string | null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const safeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const extractPrimaryImage = (hit: AlgoliaProductHit): string | null => {
  const urls = Array.isArray(hit.imageUrls)
    ? (hit.imageUrls as unknown[])
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      .map(url => url.trim())
    : [];
  if (urls.length > 0) {
    return urls[0];
  }
  return safeString(hit.imageUrl);
};

const mapHitToSearchResult = (hit: AlgoliaProductHit): SearchResult | null => {
  const id = typeof hit.objectID === 'string' ? hit.objectID.trim() : '';
  const name = safeString(hit.name);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    brand: safeString(hit.brand),
    price: toNumber(hit.price),
    image: extractPrimaryImage(hit),
    rom: toNumber(hit.rom),
    ram: toNumber(hit.ram),
    description: safeString(hit.description),
  };
};

const buildSecondaryLabel = (result: SearchResult): string | null => {
  const parts: string[] = [];
  if (result.rom) {
    parts.push(`${result.rom} Go`);
  }
  if (result.ram) {
    parts.push(`${result.ram} Go`);
  }
  if (parts.length > 0) {
    return parts.join(' + ');
  }
  if (result.description) {
    return result.description.length > 80 ? `${result.description.slice(0, 80)}...` : result.description;
  }
  return null;
};

function SearchModal({
  open,
  modalId,
  query,
  fallbackSuggestions,
  onClose,
  onQueryChange,
  onSubmit,
  onSelectSuggestion,
}: SearchModalProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setLoadingResults(false);
      setResultsError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_ALGOLIA_TERM_LENGTH) {
      setResults([]);
      setResultsError(null);
      setLoadingResults(false);
      return;
    }

    let cancelled = false;
    setLoadingResults(true);
    setResultsError(null);

    const timeoutId = window.setTimeout(() => {
      (async () => {
        try {
          const response = await algoliaClient.searchSingleIndex<AlgoliaProductHit>({
            indexName: ALGOLIA_INDEX_NAME,
            searchParams: {
              query: trimmed,
              hitsPerPage: 8,
              attributesToRetrieve: [
                'objectID',
                'name',
                'brand',
                'price',
                'imageUrl',
                'imageUrls',
                'rom',
                'ram',
                'description',
              ],
            },
          });

          if (cancelled) {
            return;
          }

          const mapped = response.hits
            .map(mapHitToSearchResult)
            .filter((item): item is SearchResult => item !== null);
          setResults(mapped);
        } catch (error) {
          if (cancelled) {
            return;
          }
          console.error('SearchModal: unable to fetch Algolia suggestions', error);
          setResults([]);
          setResultsError("Nous n'avons pas pu charger les resultats de recherche.");
        } finally {
          if (!cancelled) {
            setLoadingResults(false);
          }
        }
      })().catch(() => {
        // Error already handled in try/catch block above.
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, query]);

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
  const trimmedQuery = query.trim();
  const usingDynamicResults = trimmedQuery.length >= MIN_ALGOLIA_TERM_LENGTH;
  const hasResults = results.length > 0;
  const showSkeletons = loadingResults && results.length === 0;

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
          aria-label="Fermer la fen?tre de recherche"
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

          {usingDynamicResults ? (
            <div className="mt-5 flex flex-col gap-3" aria-label="Resultats de recherche">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resultats</p>
                {loadingResults ? (
                  <span className="text-[0.7rem] text-slate-400">Chargement...</span>
                ) : null}
              </div>
              {resultsError ? <p className="text-sm text-rose-500">{resultsError}</p> : null}
              {!loadingResults && !resultsError && !hasResults ? (
                <p className="text-sm text-slate-500">
                  Aucun produit ne correspond a &laquo; {trimmedQuery} &raquo; pour le moment.
                </p>
              ) : null}
              {showSkeletons ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-200" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
                        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
                        <div className="h-3 w-1/4 animate-pulse rounded-full bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {results.map(result => {
                const secondaryLabel = buildSecondaryLabel(result);
                const priceLabel = result.price != null ? formatPrice(result.price) : null;
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onSelectSuggestion(result.name, { id: result.id })}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-orange-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
                  >
                    <span className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                      {result.image ? (
                        <Image
                          src={result.image}
                          alt={result.name}
                          fill
                          sizes="56px"
                          className="object-cover object-center"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-xs font-semibold text-slate-400">
                          AP
                        </span>
                      )}
                    </span>
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {result.brand ? (
                          <>
                            <span className="font-bold text-orange-500">{result.brand}</span>{' '}
                            <span>{result.name}</span>
                          </>
                        ) : (
                          result.name
                        )}
                      </span>
                      {secondaryLabel ? (
                        <span className="text-xs text-slate-500">{secondaryLabel}</span>
                      ) : null}
                      {priceLabel ? (
                        <span className="text-sm font-semibold text-slate-900">{priceLabel}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Prix disponible sur demande</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Suggestions de recherche">
              <div className="w-full text-xs font-semibold uppercase tracking-wide text-slate-400">
                Suggestions populaires
              </div>
              {fallbackSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-4 sm:px-6" />
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z"
        fill="#EA4335"
        stroke="#D93025"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" fill="#FCE8E6" />
      <circle cx="12" cy="10" r="1.35" fill="#D93025" />
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



