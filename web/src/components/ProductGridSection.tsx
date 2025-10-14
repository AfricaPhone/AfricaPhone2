'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { allProducts, type ProductSummary } from '@/data/home';
import {
  collection,
  DocumentData,
  FirestoreError,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { formatPrice } from '@/utils/formatPrice';

type ProductCardData = {
  id: string;
  name: string;
  price: number | null;
  image: string;
  tagline: string;
  badge?: string;
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
};

const FALLBACK_IMAGE_DATA_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="18">Image à venir</text></svg>`
  );

const PRODUCTS_PHONE_NUMBER = '2290154151522';
const MAX_PRODUCTS = 24;

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

const parsePriceLabel = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const digitsOnly = value.replace(/\D+/g, '');
  if (digitsOnly.length === 0) {
    return null;
  }
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : null;
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

  const primaryImage =
    imageCandidates[0] ??
    safeString(data.imageUrl) ??
    FALLBACK_IMAGE_DATA_URL;

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
    taglineParts.push(storageDetails.join(' • '));
  }

  if (taglineParts.length === 0) {
    const description = safeString(data.description);
    if (description) {
      taglineParts.push(description.length > 90 ? `${description.slice(0, 90)}…` : description);
    }
  }

  const badge =
    data.enPromotion === true
      ? 'Promo'
      : typeof data.ordreVedette === 'number' && data.ordreVedette > 0
        ? 'Vedette'
        : undefined;

  return {
    id: doc.id,
    name,
    price,
    image: primaryImage,
    tagline: taglineParts.join(' • ') || 'Produit sélectionné par AfricaPhone',
    badge,
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

const mapSummaryToProduct = (product: ProductSummary): ProductCardData => {
  const price = parsePriceLabel(product.price);
  const taglineCandidates = [
    safeString(product.highlight),
    [product.segment, product.storage].filter(Boolean).join(' • '),
  ].filter((value): value is string => Boolean(value));

  let badge: string | undefined;
  const category = product.category.toLowerCase();
  if (category.includes('offre') || category.includes('promo')) {
    badge = 'Promo';
  }

  return {
    id: product.id,
    name: product.name,
    price,
    image: product.image,
    tagline: taglineCandidates[0] ?? 'Produit sélectionné par AfricaPhone',
    badge,
  };
};

const STATIC_FALLBACK_PRODUCTS = dedupeProducts(
  allProducts.slice(0, MAX_PRODUCTS).map(mapSummaryToProduct)
);

export default function ProductGridSection() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productsCollection = collection(db, 'products');
      const queries = [
        query(productsCollection, orderBy('ordreVedette', 'desc'), limit(MAX_PRODUCTS)),
        query(productsCollection, orderBy('name'), limit(MAX_PRODUCTS)),
        query(productsCollection, limit(MAX_PRODUCTS)),
      ];

      let documents: QueryDocumentSnapshot<DocumentData>[] = [];

      for (const attempt of queries) {
        try {
          const snapshot = await getDocs(attempt);
          if (!snapshot.empty) {
            documents = snapshot.docs;
            break;
          }
        } catch (error) {
          const firestoreError = error as FirestoreError;
          if (firestoreError.code === 'failed-precondition' || firestoreError.code === 'invalid-argument') {
            continue;
          }
          throw error;
        }
      }

      if (documents.length === 0) {
        const fallbackSnapshot = await getDocs(productsCollection);
        documents = fallbackSnapshot.docs.slice(0, MAX_PRODUCTS);
      }

      const mappedProducts = documents
        .map(mapDocToProduct)
        .filter((product): product is ProductCardData => product !== null);

      let normalizedProducts = dedupeProducts(mappedProducts);

      if (normalizedProducts.length === 0) {
        normalizedProducts = STATIC_FALLBACK_PRODUCTS;
      }

      setProducts(normalizedProducts);
    } catch (error) {
      console.error('ProductGridSection: unable to load products', error);
      setProducts(STATIC_FALLBACK_PRODUCTS);
      setError('Impossible de charger les produits pour le moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const content = useMemo(() => {
    if (loading) {
      return Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />);
    }

    const productCards = products.map(product => <ProductCard key={product.id} product={product} />);

    if (error) {
      const errorCard = (
        <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/90 px-6 py-12 text-center shadow-[0_18px_36px_-20px_rgba(15,23,42,0.45)]">
          <p className="text-base font-semibold text-slate-900">Nous n&apos;avons pas pu afficher la boutique.</p>
          <p className="max-w-lg text-sm text-slate-500">
            Vérifiez votre connexion internet et réessayez. Vous pouvez également nous joindre directement sur WhatsApp.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Réessayer
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

      if (productCards.length > 0) {
        return [errorCard, ...productCards];
      }

      return errorCard;
    }

    if (products.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Aucun produit disponible pour le moment.</p>
          <p className="text-sm text-slate-500">Revenez bientôt ou contactez-nous pour une sélection personnalisée.</p>
        </div>
      );
    }

    return productCards;
  }, [error, loadProducts, loading, products]);

  return (
    <section aria-labelledby="all-products" className="space-y-6">
      <h2 id="all-products" className="sr-only">
        Tous les produits
      </h2>
      <div className="grid grid-cols-2 gap-x-2 gap-y-[0.375rem] sm:gap-x-3 sm:gap-y-[0.5625rem] md:grid-cols-3 md:gap-x-3 md:gap-y-3 lg:grid-cols-4 lg:gap-x-3.5 lg:gap-y-3.5 xl:grid-cols-5 xl:gap-x-4 xl:gap-y-4">
        {content}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ProductCardData }) {
  const priceLabel = formatPrice(product.price);
  const detailHref = `/produits/${product.id}`;
  const contactMessage = encodeURIComponent(`Bonjour AfricaPhone, je suis interesse(e) par ${product.name}.`);
  const contactHref = `https://wa.me/${PRODUCTS_PHONE_NUMBER}?text=${contactMessage}`;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md sm:p-4">
      <Link
        href={detailHref}
        className="flex flex-1 flex-col gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-50 sm:aspect-[4/5] lg:aspect-[3/4]">
          {product.badge ? (
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-600 shadow-sm shadow-slate-900/10">
              {product.badge}
            </span>
          ) : null}
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
            className="object-cover object-center transition duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 text-left">
          <p className="text-base font-extrabold text-rose-600 sm:text-lg">{priceLabel}</p>
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{product.name}</h3>
          <p className="text-xs text-slate-500 sm:text-sm">{product.tagline}</p>
        </div>
      </Link>
      <a
        href={contactHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Contacter nous
      </a>
    </article>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-auto h-9 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
