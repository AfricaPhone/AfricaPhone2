import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductDetailContent from './ProductDetailContent';
import { getProductDetail } from '@/data/product-details';
import { Header, Footer } from '../../page';

type ProductDetailPageProps = {
  params: {
    productId: string;
  };
};

export function generateMetadata({ params }: ProductDetailPageProps): Metadata {
  const product = getProductDetail(params.productId);

  if (!product) {
    return {
      title: 'Produit AfricaPhone',
      description:
        'Consultez la selection AfricaPhone de smartphones, tablettes et accessoires avec verification boutique et assistance locale.',
    };
  }

  const baseTitle = `${product.name} - AfricaPhone`;
  const description =
    product.description ||
    `Decouvrez ${product.name} dans la boutique AfricaPhone. Stock physique, verification avant livraison et assistance locale.`;

  return {
    title: baseTitle,
    description,
    openGraph: {
      title: baseTitle,
      description,
      images: product.gallery?.length ? product.gallery : [product.image],
    },
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const initialProduct = getProductDetail(params.productId) ?? null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="hidden md:block">
        <Header />
      </div>
      <Suspense
        fallback={
          <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4 pb-24 pt-12 text-slate-600 lg:px-8">
            Chargement du produit...
          </main>
        }
      >
        <ProductDetailContent productId={params.productId} initialProduct={initialProduct} />
      </Suspense>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
