'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
    description: 'Mise en route complete, transfert de vos donnees et installation des applications essentielles.',
  },
  {
    title: 'Assistance locale',
    description: 'Support AfricaCare 7j/7 avec prise en charge prioritaire en boutique ou a distance.',
  },
  {
    title: 'Accessoires adaptes',
    description: 'Selection d accessoires recommandes par nos experts, disponibles en retrait ou livraison.',
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
  const router = useRouter();
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
              setError('Ce produit n est plus disponible.');
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
        console.error('ProductDetailContent: unable to load product', fetchError);
        const fallback = initialProduct ?? getProductDetail(productId) ?? null;
        if (isMounted) {
          if (fallback) {
            setProduct(combineProductData(null, fallback));
            setSelectedImage(0);
            setError('Impossible de synchroniser les donnees en temps reel pour le moment.');
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

  const [activeTab, setActiveTab] = useState<'specs' | 'description'>('specs');
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (!product) {
      return;
    }
    if (activeTab === 'specs' && product.specs.length === 0) {
      setActiveTab('description');
    }
  }, [activeTab, product]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, [productId]);

  useEffect(() => {
    if (!shareMessage) {
      return;
    }
    const timeout = setTimeout(() => setShareMessage(null), 2500);
    return () => clearTimeout(timeout);
  }, [shareMessage]);

  const toggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
    setShareMessage(isFavorite ? 'Retire des favoris' : 'Ajoute aux favoris');
  }, [isFavorite]);

  const handleShare = useCallback(async () => {
    const urlToShare = typeof window !== 'undefined' ? window.location.href : shareUrl;
    if (!urlToShare) {
      setShareMessage('Lien indisponible pour le partage.');
      return;
    }

    const shareData = {
      title: product?.name ?? 'AfricaPhone',
      text: product?.tagline ?? product?.name ?? 'Decouvrez ce produit AfricaPhone',
      url: urlToShare,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        setShareMessage('Lien partage avec succes.');
        return;
      }
    } catch (err) {
      const abortError = err instanceof Error && err.name === 'AbortError';
      if (!abortError) {
        console.error('ProductDetailContent: web share failed', err);
      }
      if (abortError) {
        return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(urlToShare);
        setShareMessage('Lien copie dans le presse-papiers.');
        return;
      } catch (clipboardError) {
        console.error('ProductDetailContent: clipboard copy failed', clipboardError);
      }
    }

    setShareMessage(`Copiez ce lien : ${urlToShare}`);
  }, [product?.name, product?.tagline, shareUrl]);

  const orderedSpecs = useMemo(() => {
    if (!product) {
      return [];
    }
    const specs = product.specs ?? [];
    if (specs.length === 0) {
      return [];
    }
    const normalizeLabel = (label: string) => label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const capacityIndex = specs.findIndex(spec => normalizeLabel(spec.label).includes('capac'));
    if (capacityIndex > 0) {
      return [specs[capacityIndex], ...specs.filter((_, index) => index !== capacityIndex)];
    }
    return specs.slice();
  }, [product]);

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

  const specsContent =
    orderedSpecs.length > 0 ? (
      <div className="overflow-hidden rounded-[28px] border border-[#EFF0F4] bg-white shadow-[0_12px_32px_rgba(17,17,17,0.06)]">
        {orderedSpecs.map((spec, index) => (
          <div
            key={`${spec.label}-${spec.value}`}
            className={`flex items-center justify-between px-6 py-5 text-[15px] leading-6 ${
              index < orderedSpecs.length - 1 ? 'border-b border-[#F1F2F6]' : ''
            }`}
          >
            <span className="text-[15px] font-medium text-[#7A7C80]">{spec.label}</span>
            <span className="max-w-[55%] text-right text-[15px] font-semibold text-[#111111]">{spec.value}</span>
          </div>
        ))}
      </div>
    ) : (
      <div className="overflow-hidden rounded-[28px] border border-[#EFF0F4] bg-white px-6 py-5 text-[15px] text-[#7A7C80] shadow-[0_12px_32px_rgba(17,17,17,0.06)]">
        Specifications a venir.
      </div>
    );

  const descriptionContent = (
    <div className="space-y-5 rounded-[28px] border border-[#EFF0F4] bg-white px-6 py-6 text-[15px] leading-relaxed text-[#7A7C80] shadow-[0_12px_32px_rgba(17,17,17,0.06)]">
      <p className="text-[#111111]">{product.description}</p>
      {product.highlights.length ? (
        <ul className="space-y-3 text-[#7A7C80]">
          {product.highlights.map(highlight => (
            <li key={highlight} className="flex items-start gap-3">
              <span className="mt-2 inline-block h-[6px] w-[6px] rounded-full bg-[#111111]" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {product.services.length ? (
        <div className="space-y-2 text-[#7A7C80]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#111111]">Services inclus</p>
          <ul className="space-y-2">
            {product.services.map(service => (
              <li
                key={service.title}
                className="rounded-[18px] border border-[#F3F4F7] bg-[#FAFBFD] px-4 py-3 text-[14px] text-[#7A7C80]"
              >
                <p className="text-[15px] font-semibold text-[#111111]">{service.title}</p>
                <p>{service.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {product.deliveryNotes.length ? (
        <div className="space-y-2 text-[#7A7C80]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#111111]">Livraison &amp; suivi</p>
          <ul className="space-y-2">
            {product.deliveryNotes.map(note => (
              <li key={note} className="flex items-start gap-3">
                <span className="mt-2 inline-block h-[6px] w-[6px] rounded-full bg-[#111111]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <span className="sr-only" aria-live="polite" role="status">
        {shareMessage ?? ''}
      </span>
      <main className="flex w-full justify-center bg-[#FFFFFF] pb-[108px] lg:pb-12">
        <div className="flex min-h-screen w-full max-w-[540px] flex-col bg-[#FFFFFF] text-[#111111]">
          <header className="flex h-[68px] items-center justify-between px-6 sm:h-[82px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Retour"
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#1111111a] text-[#111111] transition hover:bg-[#111111] hover:text-white sm:h-14 sm:w-14"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-[20px] font-semibold leading-[22px] text-[#111111] sm:text-[21px]">{product.name}</h1>
            <div className="flex items-center gap-[14px]">
              <button
                type="button"
                onClick={toggleFavorite}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-pressed={isFavorite}
                className={`inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#111111] transition sm:h-[51px] sm:w-[51px] ${
                  isFavorite ? 'bg-[#111111] text-white' : 'bg-white text-[#111111]'
                }`}
              >
                <HeartIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Partager"
                className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[#111111] bg-white text-[#111111] transition hover:bg-[#111111] hover:text-white sm:h-[59px] sm:w-[59px]"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          <section className="relative w-full overflow-hidden aspect-[540/542] max-h-[520px]">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              sizes="540px"
              className="object-cover object-center"
              priority
            />
          </section>

          <div className="flex flex-1 flex-col px-6 pb-12">
            <div className="mt-[clamp(28px,10vw,65px)] flex items-start justify-between">
              <div>
                <p className="text-[24px] font-bold leading-[24px] tracking-[-0.3px] text-[#111111]">
                  {product.formattedPrice}
                </p>
                {product.oldPriceLabel ? (
                  <span className="mt-3 inline-block text-[12px] font-semibold text-[#929497] line-through decoration-[#929497] decoration-2">
                    {product.oldPriceLabel}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="inline-flex h-[52px] w-[172px] items-center justify-center gap-3 rounded-[30px] bg-[#111111] text-white transition hover:bg-[#2c2c2c] sm:h-[59px] sm:w-[186px]"
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  <GiftIcon className="h-5 w-5 text-white" />
                </span>
                <span className="text-[16px] font-semibold leading-none">Code Promo</span>
              </button>
            </div>

            <div className="mt-6 h-px w-full bg-[#ECEDEF]" />

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`text-[16px] font-semibold ${
                    activeTab === 'specs' ? 'text-[#111111]' : 'text-[#7A7C80]'
                  }`}
                >
                  Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={`text-[16px] font-semibold ${
                    activeTab === 'description' ? 'text-[#111111]' : 'text-[#7A7C80]'
                  }`}
                >
                  Description
                </button>
              </div>
              <div className="relative mt-4 h-[2px] w-full bg-[#ECEDEF]">
                <span
                  className="absolute top-0 h-[2px] w-[245px] bg-[#111111] transition-all duration-200"
                  style={{ left: activeTab === 'specs' ? '0' : 'calc(100% - 245px)' }}
                />
              </div>
            </div>

            <div className="mt-9">{activeTab === 'specs' ? specsContent : descriptionContent}</div>

            {error ? (
              <p className="mt-6 rounded-[24px] bg-[#FFF6E6] px-4 py-4 text-[14px] font-medium text-[#C05621]">
                {error}
              </p>
            ) : null}

            <a
              href={product.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-12 hidden h-[68px] items-center gap-3 rounded-[34px] bg-[#26D367] px-5 text-white shadow-[0_16px_26px_rgba(38,211,103,0.28)] transition hover:bg-[#1fb358] lg:flex"
            >
              <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white">
                <WhatsAppGlyph className="h-5 w-5 text-[#26D367]" />
              </span>
              <span className="flex-1 text-center text-[16px] font-semibold leading-[19px]">
                Commander via WhatsApp
              </span>
            </a>
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center bg-[#FFFFFFF2] pb-[calc(env(safe-area-inset-bottom,0)+16px)] pt-3 shadow-[0_-18px_28px_-16px_rgba(17,17,17,0.18)] backdrop-blur lg:hidden">
        <div className="w-full max-w-[540px] px-6">
          <a
            href={product.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[68px] items-center gap-3 rounded-[34px] bg-[#26D367] px-5 text-white shadow-[0_16px_26px_rgba(38,211,103,0.28)] transition hover:bg-[#1fb358]"
          >
            <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white">
              <WhatsAppGlyph className="h-5 w-5 text-[#26D367]" />
            </span>
            <span className="flex-1 text-center text-[16px] font-semibold leading-[19px]">
              Commander via WhatsApp
            </span>
          </a>
        </div>
      </div>
    </>
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
      ...(payload.highlights as unknown[]).filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
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

  const highlights = dedupeArray([...(firestoreProduct?.highlights ?? []), ...(staticProduct?.highlights ?? [])]);

  const specs = mergeSpecs(firestoreProduct?.specs ?? [], staticProduct?.specs ?? []);

  const services =
    staticProduct?.services?.map(service => ({ ...service })) ??
    Array.from(DEFAULT_SERVICES, service => ({ ...service }));
  const deliveryNotes = staticProduct?.deliveryNotes?.slice() ?? Array.from(DEFAULT_DELIVERY_NOTES);

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

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2C6.46 2 2 6.22 2 11.56c0 1.77.5 3.43 1.36 4.86L2 22l5.39-1.39c1.45.8 3.09 1.23 4.61 1.23 5.54 0 10-4.22 10-9.56S17.54 2 12 2Z"
        fill="currentColor"
      />
      <path
        d="M16.04 14.59c-.2-.11-1.15-.62-1.33-.69-.18-.07-.31-.11-.44.11-.13.21-.5.69-.61.83-.11.13-.21.15-.4.06-.19-.1-.8-.3-1.51-.92-.56-.5-.93-1.09-1.04-1.28-.11-.19-.01-.3.09-.41.09-.09.21-.22.31-.33.1-.11.13-.18.19-.3.06-.12.02-.23-.02-.33-.05-.1-.37-.92-.5-1.26-.13-.32-.26-.28-.37-.29-.09-.01-.22-.01-.33-.01-.11 0-.3.04-.46.22-.16.18-.6.59-.6 1.43 0 .84.62 1.65.71 1.77.09.12 1.26 2 3.11 2.72.78.29 1.31.47 1.78.3.27-.11.86-.43.98-.85.11-.42.11-.77.08-.85-.04-.08-.16-.14-.34-.23Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20 8.75h-3.19c.38-.58.59-1.24.59-1.95A2.81 2.81 0 0 0 14.61 4c-1.26 0-2.36.79-2.61 2.06C11.75 4.79 10.65 4 9.39 4A2.81 2.81 0 0 0 6.6 6.8c0 .71.21 1.37.59 1.95H4a1.25 1.25 0 0 0-1.25 1.25v2c0 .69.56 1.25 1.25 1.25h.75v6.5A2.25 2.25 0 0 0 7 21.75h10a2.25 2.25 0 0 0 2.25-2.25v-6.5h.75A1.25 1.25 0 0 0 21.25 12v-2a1.25 1.25 0 0 0-1.25-1.25Zm-5.39-2.5c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25h-2.61c.26-1.52 1.16-2.5 2.61-2.5Zm-7.72 1.25c0-.69.56-1.25 1.25-1.25 1.45 0 2.35.98 2.61 2.5H8.14c-.69 0-1.25-.56-1.25-1.25ZM7.25 20.5a1.25 1.25 0 0 1-1.25-1.25v-6.5h5v7.75H7.25Zm11 0h-4.75v-7.75h5v6.5a1.25 1.25 0 0 1-1.25 1.25Zm2-9.25H4v-2h16v2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M11.25 4.5 6.75 10l4.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.75 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 20.25s-6.75-3.88-9-7.88c-1.32-2.41-.45-5.48 1.91-6.84 2.03-1.15 4.54-.52 6.09 1.22 1.55-1.74 4.06-2.37 6.09-1.22 2.36 1.36 3.23 4.43 1.91 6.84-2.25 4-9 7.88-9 7.88Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M17.5 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM6.5 14.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM17.5 20.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.43 11.72 15.57 7.03"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.43 12.28 15.57 16.97"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
