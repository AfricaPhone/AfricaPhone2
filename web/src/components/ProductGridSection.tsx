'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { allProducts, type ProductSummary } from '@/data/home';
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  query,
  QueryDocumentSnapshot,
  QueryConstraint,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { formatPrice } from '@/utils/formatPrice';

type ProductCardData = {
  id: string;
  name: string;
  price: number | null;
  image: string;
  tagline: string;
  badge?: string;
  ordreVedette?: number;
};

type FirestoreProductPayload = {
  name?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  imageUrls?: unknown;
  brand?: unknown;
  description?: unknown;
  rom?: unknown;
  ram?: unknown;
  ram_base?: unknown;
  ram_extension?: unknown;
  enPromotion?: unknown;
  ordreVedette?: unknown;
};

const FALLBACK_IMAGE_DATA_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="18">Image a venir</text></svg>`
  );

const PRODUCTS_PHONE_NUMBER = '2290154151522';
const PAGE_SIZE = 24;
const REQUEST_PAGE_SIZE = PAGE_SIZE + 1;

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

const mapDocToProduct = (doc: QueryDocumentSnapshot<DocumentData>): ProductCardData | null => {
  const data = doc.data() as FirestoreProductPayload;

  const name = safeString(data.name) ?? 'Produit AfricaPhone';
  const price = toNumber(data.price);

  const imageCandidates =
    Array.isArray(data.imageUrls) && data.imageUrls.length > 0
      ? (data.imageUrls as unknown[])
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim())
      : [];

  const primaryImage =
    imageCandidates[0] ??
    safeString(data.imageUrl) ??
    FALLBACK_IMAGE_DATA_URL;

  const taglineParts: string[] = [];
  const brand = safeString(data.brand);
  if (brand) {
    taglineParts.push(brand);
  }

  const rom = toNumber(data.rom);
  const ram = toNumber(data.ram);
  const storageDetails: string[] = [];
  if (rom) {
    storageDetails.push(`${rom} Go`);
  }
  if (ram) {
    storageDetails.push(`${ram} Go RAM`);
  }
  if (storageDetails.length > 0) {
    taglineParts.push(storageDetails.join(' / '));
  }

  if (taglineParts.length === 0) {
    const description = safeString(data.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}...` : description);
    }
  }

  const rawOrdreVedette =
    typeof data.ordreVedette === 'number'
      ? data.ordreVedette
      : typeof data.ordreVedette === 'string'
      ? Number(data.ordreVedette)
      : 0;
  const ordreVedette = Number.isFinite(rawOrdreVedette) ? rawOrdreVedette : 0;

  const badge = data.enPromotion === true ? 'Promo' : ordreVedette > 0 ? 'Vedette' : undefined;

  return {
    id: doc.id,
    name,
    price,
    image: primaryImage,
    tagline: taglineParts.join(' / ') || 'Produit selectionne par AfricaPhone',
    badge,
    ordreVedette,
  };
};

const dedupeProducts = (products: ProductCardData[]): ProductCardData[] => {
  const seen = new Set<string>();
  return products.filter(product => {
    if (seen.has(product.id)) {
      return false;
    }
    seen.add(product.id);
    return true;
  });
};

const sortProducts = (items: ProductCardData[]): ProductCardData[] => {
  return [...items].sort((a, b) => {
    const vedetteA = a.ordreVedette ?? 0;
    const vedetteB = b.ordreVedette ?? 0;
    if (vedetteA !== vedetteB) {
      return vedetteB - vedetteA;
    }
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });
};

const mapSummaryToProduct = (product: ProductSummary): ProductCardData => {
  const digitsOnly = product.price.replace(/\D+/g, '');
  const price = digitsOnly ? Number(digitsOnly) : null;
  const taglineCandidates = [
    safeString(product.highlight),
    [product.segment, product.storage].filter(Boolean).join(' / '),
  ].filter((value): value is string => Boolean(value));

  let badge: string | undefined;
  const category = product.category.toLowerCase();
  if (category.includes('offre') || category.includes('promo')) {
    badge = 'Promo';
  }

  return {
    id: product.id,
    name: product.name,
    price,
    image: product.image,
    tagline: taglineCandidates[0] ?? 'Produit selectionne par AfricaPhone',
    badge,
    ordreVedette: 0,
  };
};

const getFallbackProducts = (brandId?: string | null): ProductCardData[] => {
  const source = brandId
    ? allProducts.filter(product => product.brandId === brandId)
    : allProducts;
  const sliced = source.slice(0, PAGE_SIZE).map(mapSummaryToProduct);
  return sortProducts(dedupeProducts(sliced));
};

const STATIC_FALLBACK_PRODUCTS = getFallbackProducts();

type ProductGridSectionProps = {
  selectedBrand?: { id: string; name: string; filterValue?: string | null } | null;
  enableStaticFallbacks?: boolean;
};

export default function ProductGridSection(
  { selectedBrand = null, enableStaticFallbacks = true }: ProductGridSectionProps = {}
) {
  const [products, setProducts] = useState<ProductCardData[]>(() => {
    if (!selectedBrand && enableStaticFallbacks) {
      return STATIC_FALLBACK_PRODUCTS;
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const brandFilterValue = selectedBrand?.filterValue?.trim()
    ? selectedBrand.filterValue.trim()
    : selectedBrand?.name?.trim()
      ? selectedBrand.name.trim()
      : null;
  const brandFallbackId = selectedBrand?.id ?? null;

  useEffect(() => {
    setLoading(true);
    if (brandFallbackId) {
      setProducts(enableStaticFallbacks ? getFallbackProducts(brandFallbackId) : []);
    } else if (enableStaticFallbacks) {
      setProducts(STATIC_FALLBACK_PRODUCTS);
    } else {
      setProducts([]);
    }
    setHasMore(true);
    setLastDoc(null);
    setError(null);
    setPaginationError(null);
  }, [brandFallbackId, enableStaticFallbacks]);

  const loadProducts = useCallback(
    async (cursor: QueryDocumentSnapshot<DocumentData> | null, mode: 'replace' | 'append' = 'replace') => {
      if (mode === 'replace') {
        setLoading(true);
        setError(null);
        setPaginationError(null);
      } else {
        setLoadingMore(true);
        setPaginationError(null);
      }

      try {
        const productsCollection = collection(db, 'products');
        const constraints: QueryConstraint[] = [];
        if (brandFilterValue) {
          constraints.push(where('brand', '==', brandFilterValue));
        }
        if (cursor) {
          constraints.push(startAfter(cursor));
        }
        constraints.push(limit(REQUEST_PAGE_SIZE));

        const snapshot = await getDocs(query(productsCollection, ...constraints));
        const docs = snapshot.docs;
        const hasMorePage = docs.length === REQUEST_PAGE_SIZE;
        const visibleDocs = hasMorePage ? docs.slice(0, PAGE_SIZE) : docs;
        const mapped = visibleDocs
          .map(mapDocToProduct)
          .filter((item): item is ProductCardData => item !== null);
        const nextCursor =
          visibleDocs.length > 0 ? visibleDocs[visibleDocs.length - 1] : cursor ? cursor : null;

        if (mode === 'append') {
          if (mapped.length > 0) {
            setProducts(prev => sortProducts(dedupeProducts([...prev, ...mapped])));
            setLastDoc(nextCursor);
            setHasMore(hasMorePage);
          } else {
            setHasMore(false);
          }
          setLoadingMore(false);
        } else {
          if (mapped.length === 0) {
            if (enableStaticFallbacks) {
              const fallback = getFallbackProducts(brandFallbackId);
              setProducts(fallback);
              if (fallback.length === 0) {
                setError('Aucun produit disponible pour cette selection.');
              } else {
                setError(null);
              }
            } else {
              setProducts([]);
              setError(null);
            }
            setHasMore(false);
            setLastDoc(null);
          } else {
            setProducts(sortProducts(dedupeProducts(mapped)));
            setLastDoc(nextCursor);
            setHasMore(hasMorePage);
            setError(null);
          }
          setLoading(false);
        }
      } catch (loadError) {
        console.error('ProductGridSection: unable to load products', loadError);
        if (mode === 'append') {
          setPaginationError('Impossible de charger plus de produits pour le moment.');
          setLoadingMore(false);
        } else if (enableStaticFallbacks) {
          const fallback = getFallbackProducts(brandFallbackId);
          setProducts(fallback);
          setHasMore(false);
          setLastDoc(null);
          if (!brandFallbackId) {
            setError('Impossible de charger les produits pour le moment.');
          } else {
            setError(null);
          }
          setLoading(false);
        } else {
          setProducts([]);
          setHasMore(false);
          setLastDoc(null);
          setError('Impossible de charger les produits pour le moment.');
          setLoading(false);
        }
      }
  },
    [brandFallbackId, brandFilterValue, enableStaticFallbacks]
  );

  useEffect(() => {
    void loadProducts(null, 'replace');
  }, [loadProducts]);

  const handleRetry = useCallback(() => {
    void loadProducts(null, 'replace');
  }, [loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    void loadProducts(lastDoc, 'append');
  }, [hasMore, lastDoc, loadProducts, loadingMore]);

  const content = useMemo(() => {
    if (loading) {
      return Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={`skeleton-${index}`} />);
    }

    let cards = products.map(product => <ProductCard key={product.id} product={product} />);

    if (error) {
      const errorCard = (
        <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/90 px-6 py-12 text-center shadow-[0_18px_36px_-20px_rgba(15,23,42,0.45)]">
          <p className="text-base font-semibold text-slate-900">Nous n&apos;avons pas pu afficher la boutique.</p>
          <p className="max-w-lg text-sm text-slate-500">
            Verifiez votre connexion internet et reessayez. Vous pouvez egalement nous joindre directement sur WhatsApp.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Reessayer
            </button>
            <a
              href={`https://wa.me/${PRODUCTS_PHONE_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-500"
            >
              Contacter WhatsApp
            </a>
          </div>
        </div>
      );

      cards = cards.length > 0 ? [errorCard, ...cards] : [errorCard];
    } else if (cards.length === 0) {
      const noProductTitle = selectedBrand
        ? `Aucun produit ${selectedBrand.name} disponible pour le moment.`
        : 'Aucun produit disponible pour le moment.';
      return (
        <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">{noProductTitle}</p>
          <p className="text-sm text-slate-500">Revenez bientot ou contactez-nous pour une selection personnalisee.</p>
        </div>
      );
    }

    if (loadingMore) {
      const skeletons = Array.from({ length: Math.min(4, PAGE_SIZE) }).map((_, index) => (
        <ProductCardSkeleton key={`loading-more-${index}`} />
      ));
      cards = [...cards, ...skeletons];
    }

    return cards;
  }, [error, handleRetry, loading, loadingMore, products, selectedBrand]);

  return (
    <section aria-labelledby="all-products" className="space-y-6">
      <h2 id="all-products" className="sr-only">
        Tous les produits
      </h2>
      <div className="grid grid-cols-2 gap-x-2 gap-y-[0.375rem] sm:gap-x-3 sm:gap-y-[0.5625rem] md:grid-cols-3 md:gap-x-3 md:gap-y-3 lg:grid-cols-4 lg:gap-x-3.5 lg:gap-y-3.5 xl:grid-cols-5 xl:gap-x-4 xl:gap-y-4">
        {content}
      </div>
      {hasMore && !loading ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingMore ? 'Chargement...' : 'Afficher plus'}
          </button>
          {paginationError ? <p className="text-sm text-rose-600">{paginationError}</p> : null}
        </div>
      ) : paginationError ? (
        <p className="mt-4 text-center text-sm text-rose-600">{paginationError}</p>
      ) : null}
    </section>
  );
}

function ProductCard({ product }: { product: ProductCardData }) {
  const priceLabel = formatPrice(product.price);
  const detailHref = `/produits/${product.id}`;
  const contactMessage = encodeURIComponent(`Bonjour AfricaPhone, je suis interesse(e) par ${product.name}.`);
  const contactHref = `https://wa.me/${PRODUCTS_PHONE_NUMBER}?text=${contactMessage}`;
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [product.image]);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md sm:p-4">
      <Link
        href={detailHref}
        className="flex flex-1 flex-col gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-50 sm:aspect-[4/5] lg:aspect-[3/4]">
          {product.badge ? (
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-600 shadow-sm shadow-slate-900/10">
              {product.badge}
            </span>
          ) : null}
          <Image
            src={!imageErrored ? product.image : FALLBACK_IMAGE_DATA_URL}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
            className="object-cover object-center transition duration-300 group-hover:scale-105"
            onError={() => setImageErrored(true)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 text-left">
          <p className="text-base font-extrabold text-rose-600 sm:text-lg">{priceLabel}</p>
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{product.name}</h3>
          <p className="text-xs text-slate-500 sm:text-sm">{product.tagline}</p>
        </div>
      </Link>
      <a
        href={contactHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Nous contacter
      </a>
    </article>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-auto h-9 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
