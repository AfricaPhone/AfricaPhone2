'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import Carousel from "./Carousel";

export type BrandItem = {
  id: string;
  name: string;
  logoUrl: string;
  sortOrder?: number;
};

type BrandsCarouselProps = {
  selectedBrandId?: string | null;
  onBrandSelect: (brand: BrandItem) => void;
  onReset: () => void;
};

export default function BrandsCarousel({ selectedBrandId, onBrandSelect, onReset }: BrandsCarouselProps) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (brand.id === selectedBrandId) {
        onReset();
        return;
      }
      onBrandSelect(brand);
    },
    [onBrandSelect, onReset, selectedBrandId]
  );

  const cards = useMemo(() => {
    if (loading) {
      return (
        <Carousel className="-mx-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`brand-skeleton-${index}`}
              className="snap-start px-1"
            >
              <div className="flex w-20 flex-col items-center gap-2">
                <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-12 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </Carousel>
      );
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      );
    }

    if (brands.length === 0) {
      return null;
    }

    return (
      <Carousel className="-mx-1">
        {brands.map(brand => {
          const isActive = brand.id === selectedBrandId;
          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => handleSelect(brand)}
              className="snap-start px-1"
            >
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-transform duration-200 ${
                  isActive
                    ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20"
                    : "border-slate-200 bg-white shadow-sm shadow-slate-900/10 hover:-translate-y-1"
                }`}
              >
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="64px"
                  className="rounded-full object-cover"
                />
              </span>
              <span className="mt-2 block w-20 truncate text-center text-xs font-semibold text-slate-600">
                {brand.name}
              </span>
            </button>
          );
        })}
        <button
          key="cta"
          type="button"
          onClick={onReset}
          className="snap-start px-1"
        >
          <span className="flex h-16 w-28 items-center justify-center rounded-2xl border border-slate-300 bg-white px-3 text-center text-xs font-semibold text-slate-600 shadow-sm transition hover:border-orange-400 hover:text-orange-500">
            Toutes les marques
          </span>
        </button>
      </Carousel>
    );
  }, [brands, error, handleSelect, loading, onReset, selectedBrandId]);

  if (!cards) {
    return null;
  }

  return (
    <section aria-labelledby="brands-carousel" className="space-y-3 rounded-3xl bg-white px-4 py-5 shadow-[0_22px_44px_-28px_rgba(15,23,42,0.35)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="brands-carousel" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Marques partenaires
        </h2>
        {selectedBrandId ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
          >
            Effacer le filtre
          </button>
        ) : null}
      </div>
      {cards}
    </section>
  );
}
