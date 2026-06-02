'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { SegmentKey } from '@/types/catalog';
import { inferSegmentKeyFromValue } from '@/types/catalog';

export type BrandItem = {
  id: string;
  name: string;
  logoUrl: string;
  sortOrder?: number;
  filterValue?: string | null;
  heroImage?: string | null;
  description?: string | null;
  tagline?: string | null;
};

type BrandsCarouselProps = {
  activeBrandId?: string | null;
  segment?: SegmentKey | null;
  /** If true, show category-type brands (Tablettes, Accessoires). Default: false */
  showCategoryBrands?: boolean;
};

const SCROLL_CLASSNAME = 'brand-strip-scroll';

export default function BrandsCarousel({ activeBrandId, segment, showCategoryBrands = false }: BrandsCarouselProps) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    setScrollElement(node);
  }, []);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchBrands = async () => {
      setLoading(true);
      setError(null);
      try {
        const brandsCollection = collection(db, 'brands');
        const brandsQuery = query(brandsCollection, orderBy('sortOrder', 'asc'));
        const snapshot = await getDocs(brandsQuery);

        if (!isMounted) {
          return;
        }

        const mapped = snapshot.docs
          .map(doc => {
            const data = doc.data() ?? {};
            const name = typeof data.name === 'string' ? data.name.trim() : null;
            const logoUrl = typeof data.logoUrl === 'string' ? data.logoUrl.trim() : null;
            if (!name || !logoUrl) {
              return null;
            }

            const brand: BrandItem = {
              id: doc.id,
              name,
              logoUrl,
            };
            if (typeof data.sortOrder === 'number') {
              brand.sortOrder = data.sortOrder;
            }
            if (typeof data.filterValue === 'string') {
              brand.filterValue = data.filterValue.trim();
            }
            if (typeof data.heroImage === 'string') {
              brand.heroImage = data.heroImage.trim();
            }
            if (typeof data.description === 'string') {
              brand.description = data.description.trim();
            }
            if (typeof data.tagline === 'string') {
              brand.tagline = data.tagline.trim();
            }
            return brand;
          })
          .filter((item): item is BrandItem => item !== null);

        setBrands(mapped);
      } catch (fetchError) {
        console.error('BrandsCarousel: unable to load brands', fetchError);
        if (isMounted) {
          setError('Impossible de charger les marques pour le moment.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelect = useCallback(
    (brand: BrandItem) => {
      router.push(`/marques/${brand.id}`);
    },
    [router]
  );

  const updateArrowVisibility = useCallback(() => {
    if (!scrollElement) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
    setCanScrollPrev(scrollLeft > 4);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, [scrollElement]);

  useEffect(() => {
    if (!scrollElement) {
      return;
    }

    updateArrowVisibility();

    const handleScroll = () => {
      updateArrowVisibility();
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateArrowVisibility();
    });
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [scrollElement, updateArrowVisibility]);

  useEffect(() => {
    updateArrowVisibility();
  }, [brands, loading, segment, updateArrowVisibility]);

  const scrollByAmount = useCallback(
    (direction: 'prev' | 'next') => {
      if (!scrollElement) {
        return;
      }
      const amount = Math.max(scrollElement.clientWidth * 0.8, 200);
      scrollElement.scrollBy({
        left: direction === 'next' ? amount : -amount,
        behavior: 'smooth',
      });
    },
    [scrollElement]
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="relative">
          <div ref={scrollContainerRef} className={`${SCROLL_CLASSNAME} mb-2 mt-2 -mx-2 overflow-x-auto px-2 pb-1`}>
            <div className="flex items-center gap-0 pe-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`brand-skeleton-${index}`} className="flex w-20 min-w-[86px] shrink-0 flex-col items-center gap-2">
                  <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-3 w-12 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Filter by segment if provided
    let filteredBrands = segment
      ? brands.filter(brand => {
        const inferred =
          inferSegmentKeyFromValue(brand.filterValue) ??
          inferSegmentKeyFromValue(brand.tagline) ??
          inferSegmentKeyFromValue(brand.description);
        if (!inferred) {
          return segment === 'telephone';
        }
        return inferred === segment;
      })
      : brands;

    // Exclude category-type brands (Tablettes, Accessoires, À touches) unless showCategoryBrands is true
    if (!showCategoryBrands) {
      filteredBrands = filteredBrands.filter(brand => {
        const inferred =
          inferSegmentKeyFromValue(brand.filterValue) ??
          inferSegmentKeyFromValue(brand.name);
        // Exclude if it's a category (tablette, accessoire, or portable a touche)
        return inferred !== 'tablette' && inferred !== 'accessoire' && inferred !== 'portable a touche';
      });
    }

    if (error || filteredBrands.length === 0) {
      return null;
    }

    const items = filteredBrands.map(brand => (
      <div key={brand.id} className="min-w-[86px] shrink-0 lg:min-w-0 lg:flex lg:justify-center">
        <BrandLogoButton brand={brand} isActive={brand.id === activeBrandId} onSelect={handleSelect} />
      </div>
    ));

    return (
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className={`${SCROLL_CLASSNAME} mb-2 mt-2 -mx-2 overflow-x-auto px-2 pb-1 pe-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0 lg:pe-0`}
        >
          <div className="flex items-center gap-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] lg:gap-2">{items}</div>
        </div>
        {canScrollPrev ? (
          <ScrollArrowButton direction="prev" onClick={() => scrollByAmount('prev')} />
        ) : null}
        {canScrollNext ? (
          <ScrollArrowButton direction="next" onClick={() => scrollByAmount('next')} />
        ) : null}
      </div>
    );
  }, [activeBrandId, brands, canScrollNext, canScrollPrev, error, handleSelect, loading, scrollByAmount, scrollContainerRef, segment, showCategoryBrands]);

  return (
    <>
      {content}
      <style jsx global>{`
        .${SCROLL_CLASSNAME} {
          scrollbar-width: none;
        }
        .${SCROLL_CLASSNAME}::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

type BrandLogoButtonProps = {
  brand: BrandItem;
  isActive: boolean;
  onSelect: (brand: BrandItem) => void;
};

function BrandLogoButton({ brand, isActive, onSelect }: BrandLogoButtonProps) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [brand.logoUrl]);

  return (
    <button
      type="button"
      onClick={() => onSelect(brand)}
      className="flex flex-col items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition lg:w-full lg:max-w-[9rem]"
    >
      <span
        className={`relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white shadow-sm shadow-slate-900/15 transition-transform duration-150 ${isActive
          ? '-translate-y-1 ring-2 ring-[#059669] ring-offset-2 ring-offset-slate-100'
          : 'hover:-translate-y-1'
          }`}
      >
        {!errored ? (
          <Image
            src={brand.logoUrl}
            alt={brand.name}
            fill
            sizes="56px"
            className="object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <span className="text-sm font-bold uppercase tracking-wide text-slate-600">
            {brand.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="w-20 truncate text-center">{brand.name}</span>
    </button>
  );
}

type ScrollArrowButtonProps = {
  direction: 'prev' | 'next';
  onClick: () => void;
};

function ScrollArrowButton({ direction, onClick }: ScrollArrowButtonProps) {
  const isNext = direction === 'next';
  const alignmentClasses = isNext ? 'right-0 justify-end' : 'left-0 justify-start';
  return (
    <>
      <div className={`pointer-events-none absolute inset-y-0 ${alignmentClasses} flex items-center`}>
        <div className={`h-full w-8 ${isNext ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-white via-white to-transparent opacity-80`} />
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-label={isNext ? 'Afficher les prochaines marques' : 'Afficher les marques precedentes'}
        className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#059669] bg-[#059669] text-white shadow-lg shadow-[#059669]/25 transition hover:bg-[#047857] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] ${isNext ? 'right-2' : 'left-2'
          }`}
      >
        <svg className={`h-5 w-5 ${isNext ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
