'use client';

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import ProductGridSection from "@/components/ProductGridSection";
import BrandsCarousel from "@/components/BrandsCarousel";
import { Header, Footer } from "../../page";

type BrandPageProps = {
  params: Promise<{
    brandId: string;
  }>;
};

type BrandData = {
  id: string;
  name: string;
  filterValue?: string | null;
  description?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  heroImage?: string | null;
};

const FALLBACK_LOGO_DATA_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#f1f5f9"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#1f2937">AP</text></svg>`
  );

const FALLBACK_HERO_DATA_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="600" fill="#f8fafc">AfricaPhone</text></svg>`
  );

export default function BrandPage({ params }: BrandPageProps) {
  const [brandId, setBrandId] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [logoErrored, setLogoErrored] = useState(false);
  const [heroErrored, setHeroErrored] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveParams = async () => {
      try {
        const resolved = await params;
        if (isMounted) {
          setBrandId(resolved.brandId);
        }
      } catch (err) {
        console.error("BrandPage: unable to resolve params", err);
        if (isMounted) {
          setError("Impossible de charger cette marque pour le moment.");
          setBrand(null);
          setLoading(false);
        }
      }
    };

    void resolveParams();

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    setLogoErrored(false);
    setHeroErrored(false);
  }, [brandId]);

  useEffect(() => {
    if (!brandId) {
      return;
    }
    setBrand(null);
    setError(null);
    setLoading(true);
  }, [brandId]);

  useEffect(() => {
    if (!brandId) {
      return;
    }

    let isMounted = true;

    const fetchBrand = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "brands", brandId);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          if (isMounted) {
            setBrand(null);
            setError("Cette marque n'est plus disponible.");
          }
          return;
        }
        const data = snapshot.data() ?? {};
        if (isMounted) {
          setBrand({
            id: snapshot.id,
            name: typeof data.name === "string" && data.name.trim().length ? data.name.trim() : snapshot.id,
            filterValue: typeof data.filterValue === "string" ? data.filterValue.trim() : null,
            description: typeof data.description === "string" ? data.description.trim() : null,
            tagline: typeof data.tagline === "string" ? data.tagline.trim() : null,
            logoUrl: typeof data.logoUrl === "string" ? data.logoUrl.trim() : null,
            heroImage: typeof data.heroImage === "string" ? data.heroImage.trim() : null,
          });
        }
      } catch (err) {
        console.error("BrandPage: failed to load brand", err);
        if (isMounted) {
          setBrand(null);
          setError("Impossible de charger cette marque pour le moment.");
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
    return {
      id: brand.id,
      name: brand.name,
      filterValue: brand.filterValue ?? brand.name,
    };
  }, [brand]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-[0.2rem] pb-16 pt-4 sm:px-4 lg:px-8">
        <BrandsCarousel activeBrandId={brand?.id ?? null} />
        <section className="rounded-3xl bg-white px-4 py-6 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.35)] sm:px-6">
          {loading ? (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="h-16 w-16 rounded-full bg-slate-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-5 w-40 rounded-full bg-slate-200" />
                <div className="h-4 w-64 rounded-full bg-slate-200" />
              </div>
            </div>
          ) : brand ? (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-100 shadow-sm shadow-slate-900/10">
                    {brand.logoUrl && !logoErrored ? (
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                        onError={() => setLogoErrored(true)}
                      />
                    ) : (
                      <Image src={FALLBACK_LOGO_DATA_URL} alt="Logo AfricaPhone" fill sizes="56px" className="object-cover" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Univers marque</p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{brand.name}</h1>
                  </div>
                </div>
                {brand.tagline ? <p className="text-sm font-semibold text-slate-600">{brand.tagline}</p> : null}
                {brand.description ? <p className="text-sm text-slate-500">{brand.description}</p> : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
                  >
                    Retour
                  </button>
                  <a
                    href={`https://wa.me/2290154151522?text=${encodeURIComponent(`Bonjour AfricaPhone, je souhaite des conseils sur la marque ${brand.name}.`)}`}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-1.5 font-semibold text-white transition hover:bg-orange-600"
                  >
                    Contacter un conseiller
                  </a>
                </div>
              </div>
              <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-slate-200 sm:h-44 sm:w-72">
                {brand.heroImage && !heroErrored ? (
                  <Image
                    src={brand.heroImage}
                    alt={`${brand.name} visuel`}
                    fill
                    className="object-cover"
                    sizes="288px"
                    onError={() => setHeroErrored(true)}
                  />
                ) : (
                  <Image src={FALLBACK_HERO_DATA_URL} alt="Illustration AfricaPhone" fill className="object-cover" sizes="288px" />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-slate-900">Marque introuvable</p>
              <p className="text-sm text-slate-500">
                {error ?? "Cette marque n'est pas encore disponible sur la boutique web."}
              </p>
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-500"
              >
                Revenir a la boutique
              </Link>
            </div>
          )}
        </section>
        {loading ? (
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
        ) : (
          <ProductGridSection
            selectedBrand={
              selectedBrand ??
              (brandId
                ? {
                    id: brandId,
                    name: brandId,
                    filterValue: brandId,
                  }
                : null)
            }
            enableStaticFallbacks={false}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}



