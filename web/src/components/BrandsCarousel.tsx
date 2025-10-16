'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

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
};

const SCROLL_CLASSNAME = "brand-strip-scroll";

export default function BrandsCarousel({ activeBrandId }: BrandsCarouselProps) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchBrands = async () => {
      setLoading(true);
      setError(null);
      try {
        const brandsCollection = collection(db, "brands");
        const brandsQuery = query(brandsCollection, orderBy("sortOrder", "asc"));
        const snapshot = await getDocs(brandsQuery);

        if (!isMounted) {
          return;
        }

        const mapped = snapshot.docs
          .map(doc => {
            const data = doc.data() ?? {};
            const name = typeof data.name === "string" ? data.name.trim() : null;
            const logoUrl = typeof data.logoUrl === "string" ? data.logoUrl.trim() : null;
            if (!name || !logoUrl) {
              return null;
            }

            const brand: BrandItem = {
              id: doc.id,
              name,
              logoUrl,
            };
            if (typeof data.sortOrder === "number") {
              brand.sortOrder = data.sortOrder;
            }
            if (typeof data.filterValue === "string") {
              brand.filterValue = data.filterValue.trim();
            }
            if (typeof data.heroImage === "string") {
              brand.heroImage = data.heroImage.trim();
            }
            if (typeof data.description === "string") {
              brand.description = data.description.trim();
            }
            if (typeof data.tagline === "string") {
              brand.tagline = data.tagline.trim();
            }
            return brand;
          })
          .filter((item): item is BrandItem => item !== null);

        setBrands(mapped);
      } catch (fetchError) {
        console.error("BrandsCarousel: unable to load brands", fetchError);
        if (isMounted) {
          setError("Impossible de charger les marques pour le moment.");
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

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className={`${SCROLL_CLASSNAME} mb-2 -mx-2 overflow-x-auto px-2 pb-1`}>
          <div className="flex items-center gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`brand-skeleton-${index}`} className="flex w-20 flex-col items-center gap-2">
                <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-12 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error || brands.length === 0) {
      return null;
    }

    return (
      <div className={`${SCROLL_CLASSNAME} mb-2 -mx-2 overflow-x-auto px-2 pb-1`}>
        <div className="flex items-center gap-4">
          {brands.map(brand => {
            const isActive = brand.id === activeBrandId;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleSelect(brand)}
                className="flex flex-col items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition"
              >
                <span
                  className={`relative h-14 w-14 overflow-hidden rounded-full bg-white shadow-sm shadow-slate-900/15 transition-transform duration-150 ${
                    isActive ? "-translate-y-1 ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-100" : "hover:-translate-y-1"
                  }`}
                >
                  <Image src={brand.logoUrl} alt={brand.name} fill sizes="56px" className="object-cover" />
                </span>
                <span className="w-20 truncate text-center">{brand.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [activeBrandId, brands, error, handleSelect, loading]);

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
