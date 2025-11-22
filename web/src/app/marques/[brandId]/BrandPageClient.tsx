'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import { db } from '@/lib/firebaseClient';
import ProductGridSection from '@/components/ProductGridSection';

type BrandPageClientProps = {
  brandId: string;
};

type BrandData = {
  id: string;
  name: string;
  filterValue: string | null;
  description: string | null;
  tagline: string | null;
  logoUrl: string | null;
};

const BrandPageClient: React.FC<BrandPageClientProps> = ({ brandId }) => {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoErrored, setLogoErrored] = useState(false);

  useEffect(() => {
    setLogoErrored(false);
  }, [brandId]);

  useEffect(() => {
    let isMounted = true;

    const fetchBrand = async () => {
      setLoading(true);
      setError(null);
      setBrand(null);

      try {
        const ref = doc(db, 'brands', brandId);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          if (isMounted) {
            setError("Cette marque n'est plus disponible.");
          }
          return;
        }

        const data = snapshot.data() ?? {};
        if (!isMounted) {
          return;
        }

        const name = getString(data.name) ?? snapshot.id;
        const filterValue = getString(data.filterValue) ?? name;

        setBrand({
          id: snapshot.id,
          name,
          filterValue,
          description: getString(data.description),
          tagline: getString(data.tagline),
          logoUrl: getString(data.logoUrl),
        });
      } catch (err) {
        console.error('BrandPage: failed to load brand', err);
        if (isMounted) {
          setError('Impossible de charger cette marque pour le moment.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchBrand();

    return () => {
      isMounted = false;
    };
  }, [brandId]);

  const selectedBrand = useMemo(() => {
    if (!brand) {
      return null;
    }
    const id = brand.id.trim();
    const name = brand.name.trim();
    const filterValue =
      brand.filterValue && brand.filterValue.trim().length > 0 ? brand.filterValue.trim() : name;

    return {
      id,
      name,
      filterValue,
    };
  }, [brand]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 lg:px-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
          >
            <BackIcon className="h-4 w-4" />
            Retour
          </button>

          {loading ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="h-3 w-32 rounded-full bg-slate-200" />
              </div>
            </div>
          ) : brand ? (
            <div className="flex flex-1 items-center gap-3">
              <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white shadow-sm shadow-slate-900/15">
                {brand.logoUrl && !logoErrored ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                    onError={() => setLogoErrored(true)}
                  />
                ) : (
                  <span className="text-sm font-bold uppercase tracking-wide text-slate-600">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 sm:text-base">{brand.name}</span>
                {brand.tagline ? (
                  <span className="text-xs font-medium text-slate-500 sm:text-sm">{brand.tagline}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="flex-1 text-sm font-semibold text-slate-700">Marque introuvable</span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-4 lg:px-8">
        {loading ? (
          <SkeletonSection />
        ) : brand ? (
          <>
            {brand.description ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 sm:text-base">
                {brand.description}
              </div>
            ) : null}
            <ProductGridSection selectedBrand={selectedBrand} enableStaticFallbacks={false} showSegments={false} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Marque introuvable</p>
            <p className="text-sm text-slate-500">
              {error ?? "Cette marque n'est pas encore disponible sur la boutique web."}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
            >
              Retour à la boutique
            </button>
          </div>
      )}
      </main>
      <ScrollToTopButton />
    </div>
  );
};

const SkeletonSection = () => (
  <div className="space-y-4">
    <div className="h-4 w-1/2 rounded-full bg-slate-200" />
    <div className="h-4 w-3/4 rounded-full bg-slate-200" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={`brand-grid-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="aspect-[3/4] w-full rounded-xl bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-1/2 rounded-full bg-slate-200" />
            <div className="h-3 w-3/4 rounded-full bg-slate-200" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

function BackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5.25 12h13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.25 6 5.25 12l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default BrandPageClient;
