'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { allProducts, type ProductSummary } from '@/data/home';
import BrandsCarousel from '@/components/BrandsCarousel';
import {
  collection,
  DocumentData,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QueryConstraint,
  startAfter,
  startAt,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { formatPrice } from '@/utils/formatPrice';
import type { SegmentKey } from '@/types/catalog';
import { inferSegmentKeyFromValue } from '@/types/catalog';
import {
  ALGOLIA_ATTRIBUTES_TO_RETRIEVE,
  ALGOLIA_INDEX_NAME,
  algoliaClient,
  MIN_ALGOLIA_TERM_LENGTH,
  type AlgoliaProductHit,
} from '@/lib/algoliaClient';

type ProductCardData = {
  id: string;
  name: string;
  price: number | null;
  image: string | null;
  tagline: string;
  badge?: string;
  ordreVedette?: number;
  categoryKey: SegmentKey | null;
  segmentKey: SegmentKey | null;
  brandName?: string | null;
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
  category?: unknown;
  segment?: unknown;
  type?: unknown;
  tags?: unknown;
};

type AlgoliaHit = AlgoliaProductHit;

const PRODUCTS_PHONE_NUMBER = '2290154151522';
const INITIAL_PAGE_SIZE = 24;
const LOAD_MORE_PAGE_SIZE = 34;

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

  const primaryImage = imageCandidates[0] ?? safeString(data.imageUrl) ?? null;

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
  const rawCategory = safeString(data.category) ?? safeString(data.type);
  const rawSegment = safeString(data.segment);
  const rawTags = Array.isArray(data.tags) ? data.tags : [];
  const categoryKey = inferSegmentKeyFromValue(rawCategory);
  let segmentKey = inferSegmentKeyFromValue(rawSegment) ?? categoryKey;

  if (!segmentKey) {
    for (const tag of rawTags) {
      const inferred = inferSegmentKeyFromValue(tag);
      if (inferred) {
        segmentKey = inferred;
        break;
      }
    }
  }

  return {
    id: doc.id,
    name,
    price,
    image: primaryImage,
    tagline: taglineParts.join(' / ') || 'Produit selectionne par AfricaPhone',
    badge,
    ordreVedette,
    categoryKey: categoryKey ?? segmentKey ?? null,
    segmentKey: segmentKey ?? categoryKey ?? null,
    brandName: brand ?? null,
  };
};

const mapAlgoliaHitToProduct = (hit: AlgoliaHit): ProductCardData | null => {
  if (typeof hit.objectID !== 'string' || hit.objectID.trim().length === 0) {
    return null;
  }

  const id = hit.objectID.trim();
  const name = safeString(hit.name) ?? 'Produit AfricaPhone';
  const price = toNumber(hit.price);

  const imageCandidates =
    Array.isArray(hit.imageUrls) && hit.imageUrls.length > 0
      ? (hit.imageUrls as unknown[])
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim())
      : [];

  const primaryImage = imageCandidates[0] ?? safeString(hit.imageUrl) ?? null;

  const taglineParts: string[] = [];
  const brand = safeString(hit.brand);
  if (brand) {
    taglineParts.push(brand);
  }

  const rom = toNumber(hit.rom);
  const ram = toNumber(hit.ram);
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
    const description = safeString(hit.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}...` : description);
    }
  }

  const rawOrdreVedette = toNumber(hit.ordreVedette) ?? 0;
  const badge = hit.enPromotion === true ? 'Promo' : rawOrdreVedette > 0 ? 'Vedette' : undefined;
  const rawCategory = safeString(hit.category);
  const rawSegment = safeString(hit.segment);
  const rawTags = Array.isArray(hit.tags) ? hit.tags : [];
  const categoryKey = inferSegmentKeyFromValue(rawCategory);
  let segmentKey = inferSegmentKeyFromValue(rawSegment) ?? categoryKey;

  if (!segmentKey) {
    for (const tag of rawTags) {
      if (typeof tag !== 'string') {
        continue;
      }
      const inferred = inferSegmentKeyFromValue(tag);
      if (inferred) {
        segmentKey = inferred;
        break;
      }
    }
  }

  return {
    id,
    name,
    price,
    image: primaryImage,
    tagline: taglineParts.join(' / ') || 'Produit selectionne par AfricaPhone',
    badge,
    ordreVedette: rawOrdreVedette,
    categoryKey: categoryKey ?? segmentKey ?? null,
    segmentKey: segmentKey ?? categoryKey ?? null,
    brandName: brand ?? null,
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

const sortProducts = (items: ProductCardData[], mode: 'default' | 'brand' = 'default'): ProductCardData[] => {
  const list = [...items];
  if (mode === 'brand') {
    return list.sort((a, b) => {
      const priceA = typeof a.price === 'number' && Number.isFinite(a.price) ? a.price : Number.POSITIVE_INFINITY;
      const priceB = typeof b.price === 'number' && Number.isFinite(b.price) ? b.price : Number.POSITIVE_INFINITY;
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
  }

  return list.sort((a, b) => {
    const vedetteA = a.ordreVedette ?? 0;
    const vedetteB = b.ordreVedette ?? 0;
    if (vedetteA !== vedetteB) {
      return vedetteB - vedetteA;
    }
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const filterProductsBySearchTerm = (items: ProductCardData[], term: string): ProductCardData[] => {
  const trimmed = term.trim();
  if (trimmed.length === 0) {
    return items;
  }
  const normalizedTerm = normalizeText(trimmed);
  return items.filter(item => {
    const candidates = [item.name, item.tagline, item.badge ?? '', item.brandName ?? ''];
    return candidates.some(candidate => normalizeText(candidate).includes(normalizedTerm));
  });
};

const getSearchRangeEnd = (value: string): string | null => {
  if (value.length === 0) {
    return null;
  }
  const lastCharIndex = value.length - 1;
  const lastChar = value.charCodeAt(lastCharIndex);
  const nextChar = String.fromCharCode(lastChar + 1);
  return `${value.slice(0, lastCharIndex)}${nextChar}`;
};

const productMatchesBrandFilter = (product: ProductCardData, brandFilter: string | null): boolean => {
  if (!brandFilter) {
    return true;
  }
  const normalizedFilter = normalizeText(brandFilter);
  const brand = product.brandName ? normalizeText(product.brandName) : null;
  if (brand) {
    if (brand === normalizedFilter || brand.includes(normalizedFilter) || normalizedFilter.includes(brand)) {
      return true;
    }
  }
  return normalizeText(product.tagline).includes(normalizedFilter);
};

const fallbackFilterBySegment: Record<SegmentKey, (product: ProductSummary) => boolean> = {
  telephone: product =>
    inferSegmentKeyFromValue(product.segment) === 'telephone' ||
    inferSegmentKeyFromValue(product.category) === 'telephone',
  tablette: product =>
    inferSegmentKeyFromValue(product.segment) === 'tablette' || inferSegmentKeyFromValue(product.category) === 'tablette',
  'portable a touche': product =>
    inferSegmentKeyFromValue(product.segment) === 'portable a touche' ||
    inferSegmentKeyFromValue(product.category) === 'portable a touche',
  accessoire: product =>
    inferSegmentKeyFromValue(product.segment) === 'accessoire' ||
    inferSegmentKeyFromValue(product.category) === 'accessoire',
};

const SEGMENTS: Array<{
  key: SegmentKey;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}> = [
  { key: 'telephone', label: 'T?l?phones', icon: StarOutlineIcon },
  { key: 'tablette', label: 'Tablettes', icon: TabletIcon },
  { key: 'portable a touche', label: 'A touches', icon: KeypadIcon },
  { key: 'accessoire', label: 'Accessoires', icon: HeadsetIcon },
];

const SEGMENT_SCROLL_CLASSNAME = 'product-segment-scroll';
const TOP_PRODUCTS_SCROLL_CLASSNAME = 'top-products-scroll';

const productMatchesSegment = (product: ProductCardData, segment: SegmentKey): boolean => {
  return product.categoryKey === segment || product.segmentKey === segment;
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

  const categoryKey = inferSegmentKeyFromValue(product.category);
  const summarySegmentKey = inferSegmentKeyFromValue(product.segment);

  return {
    id: product.id,
    name: product.name,
    price,
    image: safeString(product.image) ?? null,
    tagline: taglineCandidates[0] ?? 'Produit selectionne par AfricaPhone',
    badge,
    ordreVedette: 0,
    categoryKey: categoryKey ?? summarySegmentKey ?? null,
    segmentKey: summarySegmentKey ?? categoryKey ?? null,
    brandName: safeString(product.brandId) ?? null,
  };
};

const getFallbackProducts = (brandId?: string | null, segment: SegmentKey = 'telephone'): ProductCardData[] => {
  let source = brandId ? allProducts.filter(product => product.brandId === brandId) : allProducts;
  const fallbackFilter = fallbackFilterBySegment[segment];
  source = source.filter(fallbackFilter);
  const sliced = source.slice(0, INITIAL_PAGE_SIZE).map(mapSummaryToProduct);
  const sortMode: 'default' | 'brand' = brandId ? 'brand' : 'default';
  return sortProducts(dedupeProducts(sliced), sortMode);
};

type ProductGridSectionProps = {
  selectedBrand?: { id: string; name: string; filterValue?: string | null } | null;
  enableStaticFallbacks?: boolean;
  searchQuery?: string | null;
  showSegments?: boolean;
};

export default function ProductGridSection({
  selectedBrand = null,
  enableStaticFallbacks = true,
  searchQuery = '',
  showSegments = true,
}: ProductGridSectionProps = {}) {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('telephone');
  const sortMode: 'default' | 'brand' = selectedBrand ? 'brand' : 'default';
  const trimmedSearchTerm = searchQuery?.trim() ?? '';
  const searchRangeEnd = useMemo(() => getSearchRangeEnd(trimmedSearchTerm), [trimmedSearchTerm]);
  const categoryFilterValue = activeSegment === 'telephone' ? null : activeSegment;
  const activeSegmentLabel = useMemo(
    () => SEGMENTS.find(segment => segment.key === activeSegment)?.label ?? 'T?l?phones',
    [activeSegment]
  );
  const [products, setProducts] = useState<ProductCardData[]>(() =>
    !selectedBrand && enableStaticFallbacks ? getFallbackProducts(null, 'telephone') : []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const brandFilterValue = selectedBrand?.filterValue?.trim()
    ? selectedBrand.filterValue.trim()
    : selectedBrand?.name?.trim()
      ? selectedBrand.name.trim()
      : null;
  const brandFallbackId = selectedBrand?.id ?? null;
  const activeBrandId = selectedBrand?.id ?? null;

  useEffect(() => {
    setLoading(true);
    if (trimmedSearchTerm.length > 0) {
      setProducts([]);
    } else if (brandFallbackId) {
      setProducts(enableStaticFallbacks ? getFallbackProducts(brandFallbackId, activeSegment) : []);
    } else if (enableStaticFallbacks) {
      setProducts(getFallbackProducts(null, activeSegment));
    } else {
      setProducts([]);
    }
    setHasMore(trimmedSearchTerm.length >= MIN_ALGOLIA_TERM_LENGTH ? false : true);
    setLastDoc(null);
    setError(null);
    setPaginationError(null);
    setLoadingMore(false);
  }, [activeSegment, brandFallbackId, enableStaticFallbacks, trimmedSearchTerm]);

  useEffect(() => {
    if (trimmedSearchTerm.length < MIN_ALGOLIA_TERM_LENGTH) {
      return;
    }

    let isCancelled = false;

    const runSearch = async () => {
      setLoading(true);
      setError(null);
      setPaginationError(null);
      setLoadingMore(false);
      setLastDoc(null);
      setHasMore(false);

      try {
        const response = await algoliaClient.searchSingleIndex<AlgoliaHit>({
          indexName: ALGOLIA_INDEX_NAME,
          searchParams: {
            query: trimmedSearchTerm,
            hitsPerPage: INITIAL_PAGE_SIZE,
            attributesToRetrieve: [...ALGOLIA_ATTRIBUTES_TO_RETRIEVE],
          },
        });

        if (isCancelled) {
          return;
        }

        const mapped = response.hits
          .map(mapAlgoliaHitToProduct)
          .filter((item): item is ProductCardData => item !== null);
        const withBrandFilter = brandFilterValue
          ? mapped.filter(product => productMatchesBrandFilter(product, brandFilterValue))
          : mapped;

        setProducts(sortProducts(dedupeProducts(withBrandFilter), sortMode));
      } catch (searchError) {
        console.error('ProductGridSection: Algolia search failed', searchError);
        if (!isCancelled) {
          setError('Impossible de charger les resultats pour cette recherche pour le moment.');
          if (enableStaticFallbacks) {
            setProducts(getFallbackProducts(brandFallbackId, activeSegment));
          } else {
            setProducts([]);
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [
    activeSegment,
    brandFallbackId,
    brandFilterValue,
    enableStaticFallbacks,
    sortMode,
    trimmedSearchTerm,
    searchAttempt,
  ]);

  const loadProducts = useCallback(
    async (cursor: QueryDocumentSnapshot<DocumentData> | null, mode: 'replace' | 'append' = 'replace') => {
      if (trimmedSearchTerm.length >= MIN_ALGOLIA_TERM_LENGTH) {
        if (mode === 'append') {
          setLoadingMore(false);
        }
        return;
      }

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
        const pageSize = mode === 'append' ? LOAD_MORE_PAGE_SIZE : INITIAL_PAGE_SIZE;
        const requestSize = pageSize + 1;
        const constraints: QueryConstraint[] = [];
        if (brandFilterValue) {
          constraints.push(where('brand', '==', brandFilterValue));
        }
        if (categoryFilterValue) {
          constraints.push(where('category', '==', categoryFilterValue));
        }
        if (trimmedSearchTerm.length > 0) {
          constraints.push(orderBy('name'));
          if (cursor) {
            constraints.push(startAfter(cursor));
          } else {
            constraints.push(startAt(trimmedSearchTerm));
          }
          if (searchRangeEnd) {
            constraints.push(endAt(searchRangeEnd));
          }
        } else if (cursor) {
          constraints.push(startAfter(cursor));
        }
        constraints.push(limit(requestSize));

        const snapshot = await getDocs(query(productsCollection, ...constraints));
        const docs = snapshot.docs;
        const hasMorePage = docs.length === requestSize;
        const visibleDocs = hasMorePage ? docs.slice(0, pageSize) : docs;
        const mapped = visibleDocs.map(mapDocToProduct).filter((item): item is ProductCardData => item !== null);
        const nextCursor = visibleDocs.length > 0 ? visibleDocs[visibleDocs.length - 1] : cursor ? cursor : null;

        if (mode === 'append') {
          if (mapped.length > 0) {
            setProducts(prev => dedupeProducts([...prev, ...mapped]));
            setLastDoc(nextCursor);
            setHasMore(hasMorePage);
          } else {
            setHasMore(false);
          }
          setLoadingMore(false);
        } else {
          if (mapped.length === 0) {
            if (enableStaticFallbacks) {
              const fallback = getFallbackProducts(brandFallbackId, activeSegment);
              setProducts(fallback);
            } else {
              setProducts([]);
            }
            setError(null);
            setHasMore(false);
            setLastDoc(null);
          } else {
            setProducts(sortProducts(dedupeProducts(mapped), sortMode));
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
          const fallback = getFallbackProducts(brandFallbackId, activeSegment);
          setProducts(fallback);
          setHasMore(false);
          setLastDoc(null);
          const fetchErrorMessage =
            trimmedSearchTerm.length > 0
              ? 'Impossible de charger les resultats pour cette recherche pour le moment.'
              : 'Impossible de charger les produits pour le moment.';
          if (!brandFallbackId) {
            setError(fetchErrorMessage);
          } else {
            setError(trimmedSearchTerm.length > 0 ? fetchErrorMessage : null);
          }
          setLoading(false);
        } else {
          setProducts([]);
          setHasMore(false);
          setLastDoc(null);
          setError(
            trimmedSearchTerm.length > 0
              ? 'Impossible de charger les resultats pour cette recherche pour le moment.'
              : 'Impossible de charger les produits pour le moment.'
          );
          setLoading(false);
        }
      }
    },
    [
      activeSegment,
      brandFallbackId,
      brandFilterValue,
      categoryFilterValue,
      enableStaticFallbacks,
      searchRangeEnd,
      sortMode,
      trimmedSearchTerm,
    ]
  );

  useEffect(() => {
    if (trimmedSearchTerm.length >= MIN_ALGOLIA_TERM_LENGTH) {
      return;
    }
    void loadProducts(null, 'replace');
  }, [loadProducts, trimmedSearchTerm]);

  const handleRetry = useCallback(() => {
    if (trimmedSearchTerm.length >= MIN_ALGOLIA_TERM_LENGTH) {
      setSearchAttempt(previous => previous + 1);
      return;
    }
    void loadProducts(null, 'replace');
  }, [loadProducts, trimmedSearchTerm]);

  const handleLoadMore = useCallback(() => {
    if (trimmedSearchTerm.length >= MIN_ALGOLIA_TERM_LENGTH) {
      return;
    }
    if (!hasMore || loadingMore) {
      return;
    }
    void loadProducts(lastDoc, 'append');
  }, [hasMore, lastDoc, loadProducts, loadingMore, trimmedSearchTerm]);

  const handleSegmentChange = useCallback((segment: SegmentKey) => {
    setActiveSegment(current => (current === segment ? current : segment));
  }, []);

  const segmentFilteredProducts = useMemo(() => {
    if (!categoryFilterValue) {
      return products;
    }
    return products.filter(product => productMatchesSegment(product, categoryFilterValue));
  }, [categoryFilterValue, products]);

  const topProducts = useMemo(() => segmentFilteredProducts.slice(0, 8), [segmentFilteredProducts]);

  const visibleProducts = useMemo(
    () => filterProductsBySearchTerm(segmentFilteredProducts, trimmedSearchTerm),
    [segmentFilteredProducts, trimmedSearchTerm]
  );

  const emptyStateTitle = useMemo(() => {
    if (trimmedSearchTerm.length > 0) {
      return `Aucun produit ne correspond a la recherche "${trimmedSearchTerm}".`;
    }
    if (categoryFilterValue) {
      if (selectedBrand) {
        return `Aucun produit ${selectedBrand.name} dans ${activeSegmentLabel.toLowerCase()} pour le moment.`;
      }
      return `Aucun produit ${activeSegmentLabel.toLowerCase()} disponible pour le moment.`;
    }
    if (selectedBrand) {
      return `Aucun produit ${selectedBrand.name} disponible pour le moment.`;
    }
    return 'Aucun produit disponible pour le moment.';
  }, [activeSegmentLabel, categoryFilterValue, selectedBrand, trimmedSearchTerm]);

  const emptyStateDescription = useMemo(() => {
    if (trimmedSearchTerm.length > 0) {
      return 'Essayez un autre terme ou contactez-nous pour une recherche personnalisee.';
    }
    return 'Revenez bientot ou contactez-nous pour une selection personnalisee.';
  }, [trimmedSearchTerm]);

  const content = useMemo(() => {
    if (loading) {
      return Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={`skeleton-${index}`} />);
    }

    let cards = visibleProducts.map(product => <ProductCard key={product.id} product={product} />);

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
      return (
        <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">{emptyStateTitle}</p>
          <p className="text-sm text-slate-500">{emptyStateDescription}</p>
        </div>
      );
    }

    if (loadingMore) {
      const skeletons = Array.from({ length: LOAD_MORE_PAGE_SIZE }).map((_, index) => (
        <ProductCardSkeleton key={`loading-more-${index}`} />
      ));
      cards = [...cards, ...skeletons];
    }

    return cards;
  }, [emptyStateDescription, emptyStateTitle, error, handleRetry, loading, loadingMore, visibleProducts]);

  return (
    <section aria-labelledby="all-products" className="space-y-6 overflow-x-hidden">
      <h2 id="all-products" className="sr-only">
        Tous les produits
      </h2>
      {showSegments ? (
        <div className="border-b border-slate-200 pb-3">
          <div className={`${SEGMENT_SCROLL_CLASSNAME} overflow-x-auto -mx-1 px-1`}>
            <div className="flex min-w-max items-center gap-2" role="group" aria-label="Filtrer les produits">
              {SEGMENTS.map(segment => {
                const isActive = segment.key === activeSegment;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => handleSegmentChange(segment.key)}
                    aria-pressed={isActive}
                    className={`group flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-transparent bg-slate-900 text-white shadow-sm shadow-slate-900/30 hover:bg-slate-800'
                        : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <segment.icon
                      className={`h-4 w-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}
                    />
                    {segment.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {!selectedBrand ? <BrandsCarousel segment={activeSegment} activeBrandId={activeBrandId} /> : null}
      {(loading && topProducts.length === 0) || topProducts.length > 0 ? (
        <TopProductsRail products={topProducts} loading={loading} />
      ) : null}
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
      <style jsx global>{`
        .${SEGMENT_SCROLL_CLASSNAME} {
          scrollbar-width: none;
        }
        .${SEGMENT_SCROLL_CLASSNAME}::-webkit-scrollbar {
          display: none;
        }
        .${TOP_PRODUCTS_SCROLL_CLASSNAME} {
          scrollbar-width: none;
        }
        .${TOP_PRODUCTS_SCROLL_CLASSNAME}::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

function TopProductsRail({ products, loading }: { products: ProductCardData[]; loading: boolean }) {
  const showSkeleton = loading && products.length === 0;
  if (!showSkeleton && products.length === 0) {
    return null;
  }

  const items = showSkeleton
    ? Array.from({ length: 4 }).map((_, index) => <TopProductSkeleton key={`top-skeleton-${index}`} />)
    : products.map(product => <TopProductCard key={`top-${product.id}`} product={product} />);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Top produits</h3>
      </div>
      <div className="relative overflow-hidden">
        <div className={`${TOP_PRODUCTS_SCROLL_CLASSNAME} flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-3 pe-8 sm:gap-3 sm:px-1.5 sm:pe-12 lg:gap-4 lg:px-2 lg:pe-16`}>
          {items}
        </div>
      </div>
    </div>
  );
}

function TopProductCard({ product }: { product: ProductCardData }) {
  const detailHref = `/produits/${product.id}`;
  const priceLabel = formatPrice(product.price);
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [product.image]);

  return (
    <Link
      href={detailHref}
      className="group flex min-w-[140px] max-w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-0 sm:min-w-[152px] sm:max-w-[152px] h-[216px] sm:h-[228px]"
    >
      <div className="relative flex-[0_0_65%] w-full overflow-hidden bg-slate-50">
        {!imageErrored && product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 28vw, 190px"
            className="object-cover object-center"
            onError={() => setImageErrored(true)}
          />
        ) : null}
      </div>
      <div className="flex flex-[0_0_35%] flex-col justify-between px-2 pb-2 pt-1.5 text-left sm:px-3 sm:pb-3">
        <p className="truncate text-[11px] font-semibold text-slate-900">{product.name}</p>
        <p
          className="text-[10px] text-slate-500"
          style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: 1 }}
        >
          {product.tagline}
        </p>
        <p className="text-[13px] font-extrabold text-rose-600">{priceLabel}</p>
      </div>
    </Link>
  );
}

function TopProductSkeleton() {
  return (
    <div className="flex min-w-[140px] max-w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:min-w-[152px] sm:max-w-[152px] h-[216px] sm:h-[228px]">
      <div className="flex-[0_0_65%] animate-pulse bg-slate-200" />
      <div className="flex flex-[0_0_35%] flex-col justify-between px-2 pb-2 pt-1.5 sm:px-3 sm:pb-3">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductCardData }) {
  const priceLabel = formatPrice(product.price);
  const detailHref = `/produits/${product.id}`;
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [product.image]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Link
        href={detailHref}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-0"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[4/5] lg:aspect-[3/4]">
          {!imageErrored && product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
              className="object-cover object-center"
              onError={() => setImageErrored(true)}
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
          <p className="text-base font-extrabold text-rose-600 sm:text-lg">{priceLabel}</p>
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{product.name}</h3>
          <p className="text-xs text-slate-500 sm:text-sm">{product.tagline}</p>
        </div>
      </Link>
    </article>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] w-full animate-pulse bg-slate-200" />
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function StarOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4.5 14.31 9l5.19.76-3.75 3.66.89 5.18L12 15.99l-4.64 2.51.89-5.18L4.5 9.76 9.69 9 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="3.75" width="12" height="16.5" rx="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="17.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function KeypadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5.25" y="3.75" width="13.5" height="16.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <g fill="currentColor">
        <circle cx="9" cy="8.5" r="0.75" />
        <circle cx="12" cy="8.5" r="0.75" />
        <circle cx="15" cy="8.5" r="0.75" />
        <circle cx="9" cy="12" r="0.75" />
        <circle cx="12" cy="12" r="0.75" />
        <circle cx="15" cy="12" r="0.75" />
        <circle cx="9" cy="15.5" r="0.75" />
        <circle cx="12" cy="15.5" r="0.75" />
        <circle cx="15" cy="15.5" r="0.75" />
      </g>
    </svg>
  );
}

function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M19.5 12.75v1.5a2.25 2.25 0 0 1-2.25 2.25H15v-6.75h2.25A2.25 2.25 0 0 1 19.5 12v.75ZM4.5 12.75v1.5A2.25 2.25 0 0 0 6.75 16.5H9v-6.75H6.75A2.25 2.25 0 0 0 4.5 12v.75ZM6.75 9a5.25 5.25 0 0 1 10.5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 16.5v.75A2.25 2.25 0 0 0 11.25 19.5h1.5A2.25 2.25 0 0 0 15 17.25V16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}








