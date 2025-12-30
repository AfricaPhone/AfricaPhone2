'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { allProducts, type ProductSummary } from '@/data/home';
import BrandsCarousel from '@/components/BrandsCarousel';
import {
  collection,
  doc,
  DocumentData,
  endAt,
  getDoc,
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
const TOP_PRODUCTS_FETCH_LIMIT = 20;

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

const buildStorageTagline = (rom: number | null, ram: number | null): string | null => {
  const romLabel = typeof rom === 'number' && Number.isFinite(rom) ? `${rom}GB` : null;
  const ramLabel = typeof ram === 'number' && Number.isFinite(ram) ? `${ram}RAM` : null;
  if (romLabel && ramLabel) {
    return `${romLabel} + ${ramLabel}`;
  }
  return romLabel ?? ramLabel ?? null;
};

const parseStorageTaglineFromText = (value?: string | null): string | null => {
  const source = safeString(value);
  if (!source) {
    return null;
  }
  const digits = source.match(/\d+/g);
  if (!digits || digits.length === 0) {
    return null;
  }
  const rom = Number(digits[0]);
  let ram: number | null = null;
  if (/\bram\b/i.test(source) && digits.length > 1) {
    ram = Number(digits[1]);
  }
  const romValue = Number.isFinite(rom) ? rom : null;
  const ramValue = typeof ram === 'number' && Number.isFinite(ram) ? ram : null;
  return buildStorageTagline(romValue, ramValue);
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
  const isAccessory = categoryKey === 'accessoire' || segmentKey === 'accessoire';

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

  const storageTagline = buildStorageTagline(rom, ram);

  if (taglineParts.length === 0) {
    const description = safeString(data.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}...` : description);
    }
  }
  const defaultTagline = taglineParts.join(' / ') || 'Produit selectionne par AfricaPhone';
  const tagline = !isAccessory && storageTagline ? storageTagline : defaultTagline;

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
    tagline,
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

  const rawCategory = safeString(hit.category) ?? safeString(hit.type);
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
  const isAccessory = categoryKey === 'accessoire' || segmentKey === 'accessoire';

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

  const storageTagline = buildStorageTagline(rom, ram);

  if (taglineParts.length === 0) {
    const description = safeString(hit.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}...` : description);
    }
  }
  const defaultTagline = taglineParts.join(' / ') || 'Produit selectionne par AfricaPhone';
  const tagline = !isAccessory && storageTagline ? storageTagline : defaultTagline;

  const rawOrdreVedette = toNumber(hit.ordreVedette) ?? 0;
  const badge = hit.enPromotion === true ? 'Promo' : rawOrdreVedette > 0 ? 'Vedette' : undefined;

  return {
    id,
    name,
    price,
    image: primaryImage,
    tagline,
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

const normalizePreferenceToken = (value: string): string => normalizeText(value).replace(/[^a-z0-9]/g, '');

const PREFERRED_TOP_PRODUCT_NAMES = ['Redmi 15c', 'Redmi A5', 'Nokia 106', 'Tecno Pop 10', 'Villaon V25'] as const;

const normalizedPreferredTopProductNames = PREFERRED_TOP_PRODUCT_NAMES.map(name => normalizePreferenceToken(name));

const topProductPreferenceMap = normalizedPreferredTopProductNames.reduce<Map<string, number>>((map, name, index) => {
  if (!map.has(name)) {
    map.set(name, index);
  }
  return map;
}, new Map<string, number>());

const getPreferredRank = (product: ProductCardData): number => {
  const normalized = normalizePreferenceToken(product.name);
  const rank = topProductPreferenceMap.get(normalized);
  return typeof rank === 'number' ? rank : Number.POSITIVE_INFINITY;
};

const prioritizeTopProducts = (items: ProductCardData[]): ProductCardData[] => {
  if (topProductPreferenceMap.size === 0) {
    return items;
  }
  return [...items].sort((a, b) => {
    const preferenceDelta = getPreferredRank(a) - getPreferredRank(b);
    if (preferenceDelta !== 0) {
      return preferenceDelta;
    }
    const vedetteA = a.ordreVedette ?? 0;
    const vedetteB = b.ordreVedette ?? 0;
    if (vedetteA !== vedetteB) {
      return vedetteB - vedetteA;
    }
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });
};

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
    { key: 'telephone', label: 'Populaires', icon: StarOutlineIcon },
    { key: 'tablette', label: 'Tablettes', icon: TabletIcon },
    { key: 'portable a touche', label: 'A touches', icon: KeypadIcon },
    { key: 'accessoire', label: 'Accessoires', icon: HeadsetIcon },
  ];

const SEGMENT_SCROLL_CLASSNAME = 'product-segment-scroll';
const TOP_PRODUCTS_SCROLL_CLASSNAME = 'top-products-scroll';

const productMatchesSegment = (product: ProductCardData, segment: SegmentKey): boolean => {
  return product.categoryKey === segment || product.segmentKey === segment;
};

const isAccessoryProduct = (product: ProductCardData): boolean => {
  return product.segmentKey === 'accessoire' || product.categoryKey === 'accessoire';
};

const mapSummaryToProduct = (product: ProductSummary): ProductCardData => {
  const digitsOnly = product.price.replace(/\D+/g, '');
  const price = digitsOnly ? Number(digitsOnly) : null;
  const categoryKey = inferSegmentKeyFromValue(product.category);
  const summarySegmentKey = inferSegmentKeyFromValue(product.segment);
  const isAccessory = categoryKey === 'accessoire' || summarySegmentKey === 'accessoire';

  const taglineCandidates = [
    safeString(product.highlight),
    [product.segment, product.storage].filter(Boolean).join(' / '),
  ].filter((value): value is string => Boolean(value));
  const storageTagline = parseStorageTaglineFromText(product.storage);
  const defaultTagline = taglineCandidates[0] ?? 'Produit selectionne par AfricaPhone';
  const tagline = !isAccessory && storageTagline ? storageTagline : defaultTagline;

  let badge: string | undefined;
  const category = product.category.toLowerCase();
  if (category.includes('offre') || category.includes('promo')) {
    badge = 'Promo';
  }

  return {
    id: product.id,
    name: product.name,
    price,
    image: safeString(product.image) ?? null,
    tagline,
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
    () => SEGMENTS.find(segment => segment.key === activeSegment)?.label ?? 'Populaires',
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
  const [topRankedProducts, setTopRankedProducts] = useState<ProductCardData[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(true);
  const brandFilterValue = selectedBrand?.filterValue?.trim()
    ? selectedBrand.filterValue.trim()
    : selectedBrand?.name?.trim()
      ? selectedBrand.name.trim()
      : null;
  const brandFallbackId = selectedBrand?.id ?? null;
  const activeBrandId = selectedBrand?.id ?? null;

  // Detect if selectedBrand is actually a category (Tablettes, Accessoires, À touches)
  const brandAsCategoryKey = useMemo(() => {
    if (!brandFilterValue) return null;
    const normalized = inferSegmentKeyFromValue(brandFilterValue);
    if (normalized === 'tablette' || normalized === 'accessoire' || normalized === 'portable a touche') {
      return normalized;
    }
    return null;
  }, [brandFilterValue]);

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
          // For category-type entries (Tablettes, Accessoires), filter by category field
          // For regular brands (Tecno, Infinix, etc.), filter by brand field
          // Use inferSegmentKeyFromValue to normalize values like "Tablettes" -> "tablette"
          const normalizedCategory = inferSegmentKeyFromValue(brandFilterValue);
          const isCategoryFilter = normalizedCategory === 'tablette' || normalizedCategory === 'accessoire' || normalizedCategory === 'portable a touche';
          if (isCategoryFilter && normalizedCategory) {
            // Fix: Filter directly in Firestore to ensure pagination works correctly
            // and pages are full. We assume the 'category' field matches the normalized key.
            // Note: This assumes products have a 'category' field matching 'tablette', 'accessoire', or 'portable a touche'.
            constraints.push(where('category', '==', normalizedCategory));
          } else {
            constraints.push(where('brand', '==', brandFilterValue));
          }
        } else if (categoryFilterValue) {
          // Home page tabs (activeSegment) filtering
          // categoryFilterValue is derived from activeSegment ('tablette', 'accessoire', 'portable a touche')
          // 'telephone' returns null so it shows "Populaires" (all products or sorted by popularity)
          constraints.push(where('category', '==', categoryFilterValue));
        }

        // NOTE: Additional client-side filtering might still happen in segmentFilteredProducts
        // to handle edge cases or segments, but the DB query should do the heavy lifting.

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

  useEffect(() => {
    let disposed = false;
    const fetchTopRankedProducts = async () => {
      setTopProductsLoading(true);
      try {
        // 1. Try to fetch from the new config/topProducts
        const configRef = doc(db, 'config', 'topProducts');
        const configSnap = await getDoc(configRef);

        let mapped: ProductCardData[] = [];

        if (configSnap.exists()) {
          const data = configSnap.data();
          const productIds = Array.isArray(data?.productIds) ? (data.productIds as string[]) : [];

          if (productIds.length > 0) {
            // Fetch these specific products
            // Since firestore 'in' query is limited to 10-30, and IDs might be more, 
            // we can fetch by documentId if < 30, or just fetch them individually in parallel.
            // For < 20 items, parallel fetch is fine.
            const fetchPromises = productIds.slice(0, 20).map(id => getDoc(doc(db, 'products', id)));
            const productSnaps = await Promise.all(fetchPromises);

            mapped = productSnaps
              .filter(s => s.exists())
              .map(mapDocToProduct)
              .filter((item): item is ProductCardData => item !== null);

            // Re-sort based on the config order (productIds)
            mapped.sort((a, b) => {
              return productIds.indexOf(a.id) - productIds.indexOf(b.id);
            });
          }
        }

        // 2. Fallback to old behavior if config logic yielded nothing
        if (mapped.length === 0) {
          const topSnapshot = await getDocs(
            query(collection(db, 'products'), orderBy('ordreVedette', 'desc'), limit(TOP_PRODUCTS_FETCH_LIMIT))
          );
          mapped = topSnapshot.docs
            .map(mapDocToProduct)
            .filter((item): item is ProductCardData => item !== null);
        }

        if (disposed) {
          return;
        }

        setTopRankedProducts(dedupeProducts(mapped));
      } catch (error) {
        console.error('ProductGridSection: unable to load top-ranked products', error);
        if (!disposed) {
          setTopRankedProducts([]);
        }
      } finally {
        if (!disposed) {
          setTopProductsLoading(false);
        }
      }
    };
    void fetchTopRankedProducts();
    return () => {
      disposed = true;
    };
  }, []);

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
    // First, filter by segment tabs (if active)
    let filtered = products;
    if (categoryFilterValue) {
      filtered = filtered.filter(product => productMatchesSegment(product, categoryFilterValue));
    }
    // Then, filter by brand-as-category (Tablettes, Accessoires pages)
    if (brandAsCategoryKey) {
      filtered = filtered.filter(product => productMatchesSegment(product, brandAsCategoryKey));
    }
    return filtered;
  }, [categoryFilterValue, brandAsCategoryKey, products]);

  const topProducts = useMemo(() => {
    const curated = topRankedProducts.filter(
      product => !isAccessoryProduct(product) && (product.ordreVedette ?? 0) > 0
    );
    const fallbackPool = segmentFilteredProducts.filter(product => !isAccessoryProduct(product));
    const combined = dedupeProducts([...curated, ...fallbackPool]);
    return prioritizeTopProducts(combined).slice(0, 8);
  }, [segmentFilteredProducts, topRankedProducts]);

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
        <div className="relative rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 p-0.5 shadow-md shadow-orange-500/20">
          <div className="rounded-[10px] bg-white/95 backdrop-blur-sm px-2 py-2 sm:px-3">
            <div className={`${SEGMENT_SCROLL_CLASSNAME} overflow-x-auto -mx-1 px-1`}>
              <div className="flex min-w-max items-center justify-center gap-1.5 sm:gap-2" role="group" aria-label="Filtrer les produits">
                {SEGMENTS.map(segment => {
                  const isActive = segment.key === activeSegment;
                  return (
                    <button
                      key={segment.key}
                      type="button"
                      onClick={() => handleSegmentChange(segment.key)}
                      aria-pressed={String(isActive) as 'true' | 'false'}
                      className={`group flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-3.5 sm:py-2 sm:text-sm ${isActive
                        ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/30'
                        : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md active:scale-95'
                        }`}
                    >
                      <segment.icon
                        className={`h-4 w-4 transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-500'}`}
                      />
                      {segment.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!selectedBrand ? <BrandsCarousel segment={activeSegment} activeBrandId={activeBrandId} /> : null}
      {!selectedBrand && !brandAsCategoryKey && (topProductsLoading || topProducts.length > 0) ? (
        <TopProductsRail products={topProducts} loading={topProductsLoading} />
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateArrowVisibility = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollPrev(scrollLeft > 4);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    updateArrowVisibility();
    const handleScroll = () => updateArrowVisibility();
    const resizeObserver = new ResizeObserver(() => updateArrowVisibility());

    el.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateArrowVisibility]);

  useEffect(() => {
    updateArrowVisibility();
  }, [products.length, updateArrowVisibility]);

  const scrollByAmount = useCallback((direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    });
  }, []);

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
        <div
          ref={scrollRef}
          className={`${TOP_PRODUCTS_SCROLL_CLASSNAME} flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-3 pe-8 sm:gap-3 sm:px-1.5 sm:pe-12 lg:gap-4 lg:px-2 lg:pe-16`}
        >
          {items}
        </div>
        {canScrollPrev ? <TopProductsArrowButton direction="prev" onClick={() => scrollByAmount('prev')} /> : null}
        {canScrollNext ? <TopProductsArrowButton direction="next" onClick={() => scrollByAmount('next')} /> : null}
      </div>
    </div>
  );
}

type TopProductsArrowButtonProps = {
  direction: 'prev' | 'next';
  onClick: () => void;
};

function TopProductsArrowButton({ direction, onClick }: TopProductsArrowButtonProps) {
  const isNext = direction === 'next';
  const alignmentClasses = isNext ? 'right-0 justify-end' : 'left-0 justify-start';

  return (
    <>
      <div className={`pointer-events-none absolute inset-y-0 ${alignmentClasses} flex items-center`}>
        <div
          className={`h-full w-8 ${isNext ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-white via-white to-transparent opacity-80`}
        />
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-label={isNext ? 'Afficher les prochains produits' : 'Afficher les produits precedents'}
        className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-orange-500 bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 ${isNext ? 'right-2' : 'left-2'
          }`}
      >
        <svg className={`h-5 w-5 ${isNext ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
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
      className="group flex min-w-[140px] max-w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-0 sm:min-w-[160px] sm:max-w-[160px] h-[252px] sm:h-[268px]"
    >
      <div className="relative flex-[0_0_60%] w-full overflow-hidden bg-slate-50">
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
      <div className="flex flex-[0_0_40%] flex-col gap-1.5 px-2 pb-2 pt-2 text-left sm:px-3 sm:pb-3">
        <p className="truncate text-[11px] font-semibold text-slate-900 sm:text-xs">{product.name}</p>
        <p className="line-clamp-2 text-[10px] font-semibold text-slate-800">
          {product.tagline}
        </p>
        <div className="mt-auto space-y-1">
          <p className="text-[13px] font-extrabold text-rose-600 sm:text-sm">{priceLabel}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 py-1 text-[10px] font-semibold text-white transition group-hover:bg-[#1EBE5D] sm:text-xs">
            <WhatsAppIcon className="h-3 w-3 text-white" />
            Commandez
          </span>
        </div>
      </div>
    </Link>
  );
}

function TopProductSkeleton() {
  return (
    <div className="flex min-w-[140px] max-w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:min-w-[160px] sm:max-w-[160px] h-[252px] sm:h-[268px]">
      <div className="flex-[0_0_60%] animate-pulse bg-slate-200" />
      <div className="flex flex-[0_0_40%] flex-col justify-between px-2 pb-2 pt-2 sm:px-3 sm:pb-3">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
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
        className="group flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-0"
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
          <p className="text-xs font-semibold text-slate-800 sm:text-sm">{product.tagline}</p>
          <div className="mt-auto">
            <span className="inline-flex max-w-fit items-center gap-2 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-[#1EBE5D] sm:text-sm">
              <WhatsAppIcon className="h-3.5 w-3.5 text-white" />
              Commandez
            </span>
          </div>
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 002.2 18.8L.5 23.5l4.8-1.7A11.5 11.5 0 1012 .5zm6.6 16.4c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.3.1-2.1-.1a19 19 0 01-3.3-1.2 11.5 11.5 0 01-3.6-2.9 6.5 6.5 0 01-1.4-2.3c-.1-.6-.1-1.1.2-1.5.2-.4.5-.6.9-.9l.2-.1c.3-.2.5-.2.6 0l.4.6c.1.2.3.4.4.6.2.4.1.6 0 .8l-.2.3c-.1.1-.1.2 0 .3a7 7 0 001.8 2.2 7 7 0 002.5 1.4c.1 0 .2 0 .3-.1l.5-.6c.2-.2.4-.2.7-.1l.8.4.6.3c.1.1.2.1.3.2.1.2 0 .4 0 .6z" />
    </svg>
  );
}








