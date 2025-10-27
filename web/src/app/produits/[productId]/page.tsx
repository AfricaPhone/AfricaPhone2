import { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import ProductDetailContent from './ProductDetailContent';
import SiteFooter from '@/components/SiteFooter';
import { getProductDetail } from '@/data/product-details';

type ProductDetailPageProps = {
  params: {
    productId: string;
  };
};

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { nullValue: null };

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

type ProductMeta = {
  name: string | null;
  description: string | null;
  image: string | null;
};

const PRODUCT_ID_REGEXP = /^[\w-]{1,128}$/;
const DEFAULT_DESCRIPTION =
  'Découvrez les smartphones, tablettes et accessoires sélectionnés par AfricaPhone avec assistance locale.';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'africaphone-vente';
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDNYwc40OWGXHrOOqqPYTB_jDGJmI7Mc1M';
const FIRESTORE_ENDPOINT = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products`;

const parseString = (value?: FirestoreValue | null): string | null => {
  if (!value) {
    return null;
  }
  if ('stringValue' in value) {
    const trimmed = value.stringValue.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if ('integerValue' in value) {
    const trimmed = value.integerValue.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if ('doubleValue' in value) {
    return Number.isFinite(value.doubleValue) ? String(value.doubleValue) : null;
  }
  return null;
};

const parseStringArray = (value?: FirestoreValue | null): string[] => {
  if (!value || !('arrayValue' in value)) {
    return [];
  }
  const items = value.arrayValue.values ?? [];
  return items
    .map(item => parseString(item))
    .filter((entry): entry is string => Boolean(entry))
    .map(entry => entry.trim());
};

const fetchProductMetadata = cache(async (productId: string): Promise<ProductMeta | null> => {
  if (!PRODUCT_ID_REGEXP.test(productId)) {
    return null;
  }

  try {
    const response = await fetch(`${FIRESTORE_ENDPOINT}/${productId}?key=${FIREBASE_API_KEY}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const document = (await response.json()) as FirestoreDocument;
    if (!document.fields) {
      return null;
    }

    const { fields } = document;
    const name = parseString(fields.name);
    const description =
      parseString(fields.description) ??
      parseString(fields.tagline) ??
      parseString(fields.summary) ??
      null;
    const imageCandidates = [
      parseString(fields.imageUrl),
      ...parseStringArray(fields.imageUrls),
    ].filter((item): item is string => Boolean(item));
    const image = imageCandidates.length > 0 ? imageCandidates[0] : null;

    if (!name && !description && !image) {
      return null;
    }

    return { name: name ?? null, description, image };
  } catch (error) {
    console.error(`ProductDetailPage: metadata fetch failed for ${productId}`, error);
    return null;
  }
});

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const initialProduct = getProductDetail(params.productId);
  const meta = await fetchProductMetadata(params.productId);

  const baseName = meta?.name ?? initialProduct?.name ?? 'Produit AfricaPhone';
  const description =
    meta?.description ??
    initialProduct?.description ??
    initialProduct?.tagline ??
    DEFAULT_DESCRIPTION;
  const image = meta?.image ?? initialProduct?.gallery?.[0] ?? initialProduct?.image ?? null;

  const title = `${baseName} | AfricaPhone`;

  const metadata: Metadata = {
    title,
    description,
  };

  const openGraphBase = {
    title,
    description,
    type: 'website' as const,
  };

  if (image) {
    metadata.openGraph = {
      ...openGraphBase,
      images: [{ url: image, width: 1200, height: 630 }],
    };
    metadata.twitter = {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    };
  } else {
    metadata.openGraph = openGraphBase;
    metadata.twitter = {
      card: 'summary',
      title,
      description,
    };
  }

  return metadata;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const initialProduct = getProductDetail(params.productId) ?? null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
            <span className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-orange-500 border-r-transparent" />
          </div>
        }
      >
        <ProductDetailContent productId={params.productId} initialProduct={initialProduct} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
