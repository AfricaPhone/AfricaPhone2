'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { ProductDetail as StaticProductDetail } from '@/data/product-details';
import { getProductDetail } from '@/data/product-details';
import { db } from '@/lib/firebaseClient';
import { formatPrice } from '@/utils/formatPrice';

const FALLBACK_IMAGE_DATA_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="18">Image a venir</text></svg>`
  );

const PRODUCTS_PHONE_NUMBER = '2290154151522';
const DEFAULT_DELIVERY_NOTES = [
  'Retrait express en boutique AfricaPhone ou livraison sous 24 h sur Grand Cotonou.',
  'Verification complete avant expedition et emballage securise.',
  'Suivi personnalise avec un conseiller AfricaPhone jusqu a la reception.',
] as const;

const DEFAULT_SERVICES = [
  {
    title: 'Configuration offerte',
    description:
      'Mise en route complete, transfert de vos donnees et installation des applications essentielles.',
  },
  {
    title: 'Assistance locale',
    description:
      'Support AfricaCare 7j/7 avec prise en charge prioritaire en boutique ou a distance.',
  },
  {
    title: 'Accessoires adaptes',
    description:
      'Selection d accessoires recommandes par nos experts, disponibles en retrait ou livraison.',
  },
] as const;

type FirestoreProductPayload = {
  name?: unknown;
  price?: unknown;
  oldPrice?: unknown;
  imageUrl?: unknown;
  imageUrls?: unknown;
  brand?: unknown;
  description?: unknown;
  rom?: unknown;
  ram?: unknown;
  ram_base?: unknown;
  ram_extension?: unknown;
  badge?: unknown;
  highlight?: unknown;
  highlights?: unknown;
};

type FirestoreProduct = {
  id: string;
  name: string;
  price: number | null;
  oldPrice: number | null;
  image: string;
  gallery: string[];
  tagline: string;
  description: string | null;
  brand: string | null;
  badge: string | null;
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
};

type CombinedProduct = {
  id: string;
  name: string;
  tagline: string;
  price: number | null;
  formattedPrice: string;
  oldPriceLabel?: string;
  savingsLabel?: string;
  badge?: string;
  description: string;
  gallery: string[];
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
  services: Array<{ title: string; description: string }>;
  deliveryNotes: string[];
  rating?: number;
  reviews?: number;
  whatsappLink: string;
};

type ProductDetailContentProps = {
  productId: string;
  initialProduct: StaticProductDetail | null;
};

export default function ProductDetailContent({ productId, initialProduct }: ProductDetailContentProps) {
  const [product, setProduct] = useState<CombinedProduct | null>(() =>
    initialProduct ? combineProductData(null, initialProduct) : null
  );
  const [loading, setLoading] = useState<boolean>(!product);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadProductDetail() {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, 'products', productId);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          const fallback = getProductDetail(productId);
          if (isMounted) {
            if (fallback) {
              setProduct(combineProductData(null, fallback));
              setSelectedImage(0);
              setError(null);
            } else {
              setProduct(null);
              setError("Ce produit n'est plus disponible.");
            }
          }
          return;
        }

        const normalized = normalizeFirestoreProduct(snapshot.id, snapshot.data());
        const fallbackStatic = initialProduct ?? getProductDetail(productId) ?? null;

        if (isMounted) {
          const merged = combineProductData(normalized, fallbackStatic);
          setProduct(merged);
          setSelectedImage(0);
        }
      } catch (fetchError) {
        const fallback = initialProduct ?? getProductDetail(productId) ?? null;
        if (isMounted) {
          if (fallback) {
            setProduct(combineProductData(null, fallback));
            setSelectedImage(0);
            setError("Impossible de synchroniser les donnees en temps reel pour le moment.");
          } else {
            setProduct(null);
            setError('Impossible de charger ce produit.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProductDetail();

    return () => {
      isMounted = false;
    };
  }, [initialProduct, productId]);

  const activeImage = useMemo(() => {
    if (!product || product.gallery.length === 0) {
      return FALLBACK_IMAGE_DATA_URL;
    }
    return product.gallery[selectedImage] ?? product.gallery[0];
  }, [product, selectedImage]);

  if (loading && !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center">
        <span className="text-base font-semibold text-slate-600">Chargement du produit...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl font-bold text-slate-900">Produit introuvable</p>
        <p className="max-w-xl text-sm text-slate-500">
          Ce produit n est plus reference dans notre boutique en ligne. Contactez un conseiller AfricaPhone si vous
          cherchez une alternative ou pour verifier la disponibilite en magasin.
        </p>
        <a
          href={`https://wa.me/${PRODUCTS_PHONE_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          Contacter un conseiller
        </a>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-12 text-slate-900 lg:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
        <Link href="/" className="transition hover:text-rose-500">
          Accueil
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/#catalogue" className="transition hover:text-rose-500">
          Catalogue
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-white shadow-[0_28px_48px_-22px_rgba(15,23,42,0.35)]">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 90vw, 45vw"
              className="object-cover"
              priority
            />
            {product.badge ? (
              <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 shadow">
                {product.badge}
              </span>
            ) : null}
          </div>
          {product.gallery.length > 1 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.gallery.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${
                    selectedImage === index ? 'border-rose-500' : 'border-transparent'
                  }`}
                >
                  <Image
                    src={imageUrl}
                    alt={`${product.name} - vignette ${index + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-[0_32px_56px_-28px_rgba(15,23,42,0.35)] lg:p-8">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600">
              Disponible
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
            <p className="text-sm font-medium text-slate-500 sm:text-base">{product.tagline}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-extrabold text-rose-600 sm:text-4xl">{product.formattedPrice}</p>
              {product.oldPriceLabel ? (
                <span className="text-sm text-slate-400 line-through">{product.oldPriceLabel}</span>
              ) : null}
              {product.savingsLabel ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                  {product.savingsLabel}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">{product.description}</p>
          </div>

          {product.highlights.length > 0 ? (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Points forts</p>
              <ul className="space-y-2">
                {product.highlights.map(highlight => (
                  <li key={highlight} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">
                      ✓
                    </span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl bg-slate-900 p-5 text-white shadow-[0_24px_44px_-24px_rgba(16,185,129,0.45)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Conseiller AfricaPhone</p>
              <p className="text-lg font-bold">Vous souhaitez reserver ce produit ?</p>
              <p className="text-sm text-slate-200">
                Ecrivez-nous sur WhatsApp pour verifier la disponibilite, reserver un stock en boutique ou demander un
                paiement a distance.
              </p>
            </div>
            <a
              href={product.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Discuter sur WhatsApp
            </a>
            <p className="text-xs text-slate-300">
              Numero direct:{' '}
              <a href="tel:+2290154151522" className="font-semibold text-white underline">
                01 54 15 15 22
              </a>
            </p>
          </div>

          {product.specs.length > 0 ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Caracteristiques</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                {product.specs.map(spec => (
                  <div key={`${spec.label}-${spec.value}`} className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{spec.label}</dt>
                    <dd className="text-sm font-semibold text-slate-700">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_28px_48px_-28px_rgba(15,23,42,0.3)] lg:p-8">
          <h2 className="text-lg font-bold text-slate-900">Services inclus</h2>
          <div className="space-y-3">
            {product.services.map(service => (
              <div key={service.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{service.title}</p>
                <p className="text-sm text-slate-500">{service.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_28px_48px_-28px_rgba(15,23,42,0.3)] lg:p-8">
          <h2 className="text-lg font-bold text-slate-900">Livraison & suivi</h2>
          <ul className="space-y-3">
            {product.deliveryNotes.map(note => (
              <li key={note} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  ✓
                </span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {error ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">{error}</p>
      ) : null}
    </main>
  );
}

function normalizeFirestoreProduct(id: string, data: DocumentData): FirestoreProduct | null {
  const payload = data as FirestoreProductPayload;
  const name = safeString(payload.name) ?? 'Produit AfricaPhone';
  const price = toNumber(payload.price);
  const oldPrice = toNumber(payload.oldPrice);

  const imageCandidates =
    Array.isArray(payload.imageUrls) && payload.imageUrls.length > 0
      ? (payload.imageUrls as unknown[])
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim())
      : [];

  const primaryImage = imageCandidates[0] ?? safeString(payload.imageUrl) ?? FALLBACK_IMAGE_DATA_URL;

  const taglineParts: string[] = [];
  const brand = safeString(payload.brand);
  if (brand) {
    taglineParts.push(brand);
  }

  const rom = toNumber(payload.rom);
  const ram = toNumber(payload.ram);

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
    const description = safeString(payload.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}...` : description);
    }
  }

  const highlightSource: string[] = [];
  if (Array.isArray(payload.highlights)) {
    highlightSource.push(
      ...(payload.highlights as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    );
  } else if (typeof payload.highlight === 'string' && payload.highlight.trim().length > 0) {
    highlightSource.push(payload.highlight.trim());
  }

  const specs: Array<{ label: string; value: string }> = [];
  if (brand) {
    specs.push({ label: 'Marque', value: brand });
  }
  if (rom) {
    specs.push({ label: 'Stockage', value: `${rom} Go` });
  }
  if (ram) {
    specs.push({ label: 'Memoire vive', value: `${ram} Go` });
  }
  const ramBase = safeString(payload.ram_base);
  const ramExtension = safeString(payload.ram_extension);
  if (ramBase || ramExtension) {
    specs.push({
      label: 'Extension RAM',
      value: [ramBase, ramExtension].filter(Boolean).join(' + '),
    });
  }

  return {
    id,
    name,
    price,
    oldPrice,
    image: primaryImage,
    gallery: dedupeArray([primaryImage, ...imageCandidates]).filter(
      image => typeof image === 'string' && image.trim().length > 0
    ),
    tagline: taglineParts.join(' / ') || 'Produit AfricaPhone',
    description: safeString(payload.description),
    brand: brand ?? null,
    badge: safeString(payload.badge),
    highlights: dedupeArray(highlightSource),
    specs,
  };
}

function combineProductData(
  firestoreProduct: FirestoreProduct | null,
  staticProduct: StaticProductDetail | null
): CombinedProduct | null {
  if (!firestoreProduct && !staticProduct) {
    return null;
  }

  const resolvedId = firestoreProduct?.id ?? staticProduct?.id;
  if (!resolvedId) {
    return null;
  }

  const rawGallery = dedupeArray([
    ...(firestoreProduct?.gallery ?? []),
    firestoreProduct?.image ?? null,
    ...(staticProduct?.gallery ?? []),
    staticProduct?.image ?? null,
  ]);
  const gallery = rawGallery.filter(image => typeof image === 'string' && image.trim().length > 0) as string[];

  const priceNumber = firestoreProduct?.price ?? parsePriceLabel(staticProduct?.price);
  const oldPriceNumber = firestoreProduct?.oldPrice ?? parsePriceLabel(staticProduct?.oldPrice);

  const formattedPrice = formatPrice(priceNumber);
  const oldPriceLabel = oldPriceNumber ? formatPrice(oldPriceNumber) : undefined;
  const savingsLabel = staticProduct?.savings ?? undefined;

  const highlights = dedupeArray([
    ...(firestoreProduct?.highlights ?? []),
    ...(staticProduct?.highlights ?? []),
  ]);

  const specs = mergeSpecs(firestoreProduct?.specs ?? [], staticProduct?.specs ?? []);

  const services =
    staticProduct?.services?.map(service => ({ ...service })) ?? Array.from(DEFAULT_SERVICES, service => ({ ...service }));
  const deliveryNotes =
    staticProduct?.deliveryNotes?.slice() ?? Array.from(DEFAULT_DELIVERY_NOTES);

  const tagline =
    firestoreProduct?.tagline ||
    staticProduct?.tagline ||
    (firestoreProduct?.brand ? `${firestoreProduct.brand} - Selection AfricaPhone` : 'Selection AfricaPhone');

  const description =
    firestoreProduct?.description ||
    staticProduct?.description ||
    'Produit selectionne par AfricaPhone avec verification boutique et assistance locale.';

  const whatsappLink = buildWhatsappLink({
    name: firestoreProduct?.name ?? staticProduct?.name ?? 'Produit AfricaPhone',
    priceLabel: priceNumber ? formattedPrice : null,
  });

  return {
    id: resolvedId,
    name: firestoreProduct?.name ?? staticProduct?.name ?? 'Produit AfricaPhone',
    tagline,
    price: priceNumber,
    formattedPrice,
    oldPriceLabel,
    savingsLabel,
    badge: firestoreProduct?.badge ?? staticProduct?.badge,
    description,
    gallery: gallery.length > 0 ? gallery : [FALLBACK_IMAGE_DATA_URL],
    highlights,
    specs,
    services,
    deliveryNotes,
    rating: staticProduct?.rating,
    reviews: staticProduct?.reviews,
    whatsappLink,
  };
}

function mergeSpecs(
  primarySpecs: Array<{ label: string; value: string }>,
  fallbackSpecs: Array<{ label: string; value: string }> | undefined
) {
  const map = new Map<string, { label: string; value: string }>();
  for (const spec of fallbackSpecs ?? []) {
    const key = spec.label.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { label: spec.label, value: spec.value });
    }
  }
  for (const spec of primarySpecs) {
    const key = spec.label.trim().toLowerCase();
    map.set(key, { label: spec.label, value: spec.value });
  }

  return Array.from(map.values());
}

function dedupeArray<T>(items: (T | null | undefined)[]): T[] {
  return Array.from(new Set(items.filter((item): item is T => item !== null && item !== undefined)));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const sanitized = value.replace(/\s+/g, '').replace(/[^\d.-]+/g, '');
    if (!sanitized) {
      return null;
    }
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePriceLabel(label: string | undefined | null): number | null {
  if (typeof label !== 'string') {
    return null;
  }
  const digitsOnly = label.replace(/\D+/g, '');
  if (!digitsOnly) {
    return null;
  }
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildWhatsappLink({ name, priceLabel }: { name: string; priceLabel: string | null }) {
  const baseMessage = priceLabel
    ? `Bonjour AfricaPhone, je suis interesse(e) par ${name} (${priceLabel}).`
    : `Bonjour AfricaPhone, je suis interesse(e) par ${name}.`;
  const encoded = encodeURIComponent(baseMessage);
  return `https://wa.me/${PRODUCTS_PHONE_NUMBER}?text=${encoded}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12.04 2.75c-5.16 0-9.34 4.12-9.34 9.2 0 1.62.43 3.14 1.19 4.46L2 22l5.81-1.53a9.42 9.42 0 0 0 4.23 1.0c5.16 0 9.34-4.12 9.34-9.2s-4.18-9.52-9.34-9.52Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.88c-.16-.36-.34-.37-.5-.38-.13-.01-.28-.01-.42-.01-.15 0-.4.05-.61.28-.21.23-.81.79-.81 1.92 0 1.13.83 2.23.95 2.39.12.16 1.62 2.58 4.0 3.51 1.98.71 2.38.57 2.81.54.43-.03 1.38-.56 1.58-1.1.2-.54.2-1 .14-1.1-.06-.1-.22-.16-.46-.28-.24-.12-1.38-.67-1.6-.75-.22-.08-.37-.12-.53.12-.16.24-.62.75-.76.9-.14.15-.28.17-.52.05-.24-.12-1.02-.37-1.95-1.17-.72-.63-1.2-1.4-1.34-1.64-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.52-1.29-.74-1.77Z"
        fill="currentColor"
      />
    </svg>
  );
}
