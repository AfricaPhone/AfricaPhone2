'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import ProductGridSection from '@/components/ProductGridSection';

type BrandPageClientProps = {
  brandId: string;
};

type BrandData = {
  id: string;
  name: string;
  filterValue?: string | null;
  description?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
};

const FALLBACK_LOGO_DATA_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#f1f5f9"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#1f2937">AP</text></svg>`
  );

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

        const name = typeof data.name === 'string' && data.name.trim().length ? data.name.trim() : snapshot.id;
        const filterValue =
          typeof data.filterValue === 'string' && data.filterValue.trim().length ? data.filterValue.trim() : name;

        setBrand({
          id: snapshot.id,
          name,
          filterValue,
          description: typeof data.description === 'string' ? data.description.trim() : null,
          tagline: typeof data.tagline === 'string' ? data.tagline.trim() : null,
          logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl.trim() : null,
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
    const cleanId = typeof brand.id === 'string' ? brand.id.trim() : brand.id;
    const cleanName = typeof brand.name === 'string' ? brand.name.trim() : brand.name;
    const cleanFilter =
      typeof brand.filterValue === 'string' && brand.filterValue.trim().length > 0 ? brand.filterValue.trim() : null;

    return {
      id: cleanId ?? brand.id,
      name: cleanName ?? brand.name,
      filterValue: cleanFilter ?? cleanName ?? cleanId ?? null,
    };
  }, [brand]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
          >
            <BackIcon className="h-4 w-4" />
            Retour
          </button>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-slate-200" />
              <span className="h-3 w-20 rounded-full bg-slate-200" />
            </div>
          ) : brand ? (
            <div className="flex items-center gap-2">
              <span className="relative h-10 w-10 overflow-hidden rounded-full bg-white shadow-sm shadow-slate-900/15">
                <Image
                  src={!logoErrored && brand.logoUrl ? brand.logoUrl : FALLBACK_LOGO_DATA_URL}
                  alt={brand.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  onError={() => setLogoErrored(true)}
                />
              </span>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-900 sm:text-base">{brand.name}</span>
                {brand.tagline ? (
                  <span className="text-xs font-medium text-slate-500 sm:text-sm">{brand.tagline}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-700">Marque introuvable</span>
          )}
          <span className="hidden h-8 w-[92px] shrink-0 lg:block" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-6 lg:px-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 w-1/2 rounded-full bg-slate-200" />
            <div className="h-4 w-3/4 rounded-full bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`brand-grid-skeleton-${index}`}
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
          </div>
        ) : brand ? (
          <>
            {brand.description ? <p className="text-sm text-slate-600 sm:text-base">{brand.description}</p> : null}
            <ProductGridSection selectedBrand={selectedBrand} enableStaticFallbacks={false} />
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
    </div>
  );
};

function BackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M8.25 5.75 3 10l5.25 4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default BrandPageClient;
