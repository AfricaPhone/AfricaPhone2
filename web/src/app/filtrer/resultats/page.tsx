'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { formatPrice } from '@/utils/formatPrice';

type FilterState = {
  minPrice: string;
  maxPrice: string;
  rom: string;
  ram: string;
};

type ProductHit = {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  price: number | null;
  formattedPrice: string;
  tagline: string | null;
  rom: number | null;
  ram: number | null;
  enPromotion: boolean;
  ordreVedette: number;
};

const MAX_FETCH_LIMIT = 200;

function ResultatsFiltresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramsKey = searchParams.toString();

  const filters = useMemo(() => parseFilters(new URLSearchParams(paramsKey)), [paramsKey]);
  const { products, loading, error } = useFilteredProducts(filters);

  const activeChips = useMemo(() => buildActiveChips(filters), [filters]);
  const filterQuery = paramsKey.length > 0 ? `?${paramsKey}` : '';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catalogue</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Resultats filtres</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/filtrer${filterQuery}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
            >
              Modifier les filtres
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Fermer les resultats"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
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
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600"
                  >
                    {chip.label}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <ResultsSection products={products} loading={loading} error={error} />
      </main>
    </div>
  );
}

export default function ResultatsFiltresPage() {
  return (
    <Suspense fallback={<FiltersPageFallback />}>
      <ResultatsFiltresContent />
    </Suspense>
  );
}

function FiltersPageFallback() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-56 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`filters-fallback-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="aspect-[3/4] w-full rounded-xl bg-slate-200" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-1/2 rounded-full bg-slate-200" />
                <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                <div className="h-3 w-2/3 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function parseFilters(searchParams: URLSearchParams): FilterState {
  return {
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    rom: searchParams.get('rom') ?? '',
    ram: searchParams.get('ram') ?? '',
  };
}

function buildActiveChips(filters: FilterState) {
  const chips: Array<{ key: string; label: string }> = [];

  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `${Number(filters.minPrice).toLocaleString('fr-FR')} F` : '0';
    const max = filters.maxPrice ? `${Number(filters.maxPrice).toLocaleString('fr-FR')} F` : 'illimite';
    chips.push({ key: 'price', label: `${min} - ${max}` });
  }
  if (filters.rom) {
    chips.push({ key: 'rom', label: `${filters.rom} Go ROM` });
  }
  if (filters.ram) {
    chips.push({ key: 'ram', label: `${filters.ram} Go RAM` });
  }

  return chips;
}

const ResultsSection = ({
  products,
  loading,
  error,
}: {
  products: ProductHit[];
  loading: boolean;
  error: string | null;
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`filters-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="aspect-[3/4] w-full rounded-xl bg-slate-200" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-1/2 rounded-full bg-slate-200" />
              <div className="h-3 w-3/4 rounded-full bg-slate-200" />
              <div className="h-3 w-2/3 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600 shadow-sm">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center text-sm text-slate-500">
        Aucun produit ne correspond a ces filtres pour le moment. Essayez d&apos;elargir votre recherche ou retournez aux filtres.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {products.length} resultat{products.length > 1 ? 's' : ''}
        </h2>
        <span className="text-xs text-slate-500">Tri alphabetique</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product }: { product: ProductHit }) => (
  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
    <Link
      href={`/produits/${product.id}`}
      className="group flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover object-center transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
          {product.brand ?? 'AfricaPhone'}
        </p>
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{product.name}</h3>
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-rose-600 sm:text-base">{product.formattedPrice}</p>
            {product.enPromotion ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">Promo</span>
            ) : product.ordreVedette > 0 ? (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                Vedette
              </span>
            ) : null}
          </div>
          <span className="inline-flex max-w-fit items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 sm:text-sm">
            Voir details
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3.5 7H10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 4L10.5 7L7.5 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  </article>
);

function useFilteredProducts(filters: FilterState) {
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const snapshot = await getDocs(
          query(collection(db, 'products'), orderBy('name'), limit(MAX_FETCH_LIMIT))
        );

        if (cancelled) {
          return;
        }

        const mapped = snapshot.docs
          .map(doc => mapDocToHit(doc.id, doc.data()))
          .filter((item): item is ProductHit => item !== null);

        const filtered = mapped
          .filter(product => matchesFilters(product, filters))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        setProducts(filtered);
      } catch (err) {
        console.error('FilterResults: unable to fetch products', err);
        if (!cancelled) {
          setError("Impossible d'appliquer ces filtres pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetch();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return { products, loading, error };
}

function mapDocToHit(id: string, data: Record<string, unknown>): ProductHit | null {
  const name = getString(data.name) ?? 'Produit AfricaPhone';
  const brand = getString(data.brand);

  const imageCandidates =
    Array.isArray(data.imageUrls) && data.imageUrls.length > 0
      ? (data.imageUrls as unknown[])
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim())
      : [];
  const image = imageCandidates[0] ?? getString(data.imageUrl) ?? null;

  const price =
    typeof data.price === 'number'
      ? data.price
      : typeof data.price === 'string'
        ? Number(data.price)
        : null;
  const formattedPrice = formatPrice(price);

  const description = getString(data.description);
  const tagline = description ? (description.length > 90 ? `${description.slice(0, 90)}...` : description) : null;

  const rom = typeof data.rom === 'number' ? data.rom : typeof data.rom === 'string' ? Number(data.rom) : null;
  const ram = typeof data.ram === 'number' ? data.ram : typeof data.ram === 'string' ? Number(data.ram) : null;

  const enPromotion = data.enPromotion === true;
  const ordreVedette =
    typeof data.ordreVedette === 'number'
      ? data.ordreVedette
      : typeof data.ordreVedette === 'string'
        ? Number(data.ordreVedette)
        : 0;

  return {
    id,
    name,
    brand,
    image,
    price,
    formattedPrice,
    tagline,
    rom,
    ram,
    enPromotion,
    ordreVedette,
  };
}

function matchesFilters(product: ProductHit, filters: FilterState) {
  if (filters.minPrice) {
    const min = Number(filters.minPrice);
    if (Number.isFinite(min) && product.price !== null && product.price < min) {
      return false;
    }
  }

  if (filters.maxPrice) {
    const max = Number(filters.maxPrice);
    if (Number.isFinite(max) && product.price !== null && product.price > max) {
      return false;
    }
  }

  if (filters.rom) {
    const desired = Number(filters.rom);
    if (Number.isFinite(desired)) {
      if (product.rom !== null) {
        if (product.rom !== desired) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  if (filters.ram) {
    const desired = Number(filters.ram);
    if (Number.isFinite(desired)) {
      if (product.ram !== null) {
        if (product.ram !== desired) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  return true;
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
