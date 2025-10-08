'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  brandLabelById,
  catalogProducts,
  formatCurrency,
  getProductById,
  type CatalogProduct,
} from "@/data/catalog";
import { buildProductDetailContent } from "@/data/product-details";

type ProductDetailPageProps = {
  params: {
    productId: string;
  };
};

const WHATSAPP_NUMBER = "22961000000";
const STORE_PHONE = "+229 64 00 00 00";

const SERVICE_CARDS = [
  {
    title: "Livraison nationale",
    description: "Expédition express sur Cotonou et livraison partout au Bénin sous 24 à 72 h.",
    icon: TruckIcon,
  },
  {
    title: "Garantie AfricaPhone",
    description: "Prise en charge locale 12 mois, diagnostics et prêt d’appareil selon disponibilité.",
    icon: ShieldIcon,
  },
  {
    title: "Configuration offerte",
    description: "Migration de données, installation des applis clés et tutoriel de prise en main.",
    icon: SparkIcon,
  },
];

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const productId = decodeURIComponent(params.productId);
  const product = getProductById(productId);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 pb-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <SparkIcon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Produit introuvable</h1>
            <p className="text-sm text-slate-600">
              Nous n’avons pas retrouvé ce produit dans notre catalogue web. Il est possible qu’il soit en cours
              d’ajout ou qu’il ne soit plus disponible.
            </p>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
          >
            Retourner au catalogue
            <ArrowIcon className="h-4 w-4 text-white" />
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailContentView product={product} />;
}

function ProductDetailContentView({ product }: { product: CatalogProduct }) {
  const detailContent = buildProductDetailContent(product);
  const gallery = detailContent.gallery.length > 0 ? detailContent.gallery : [product.image];
  const brandLabel = brandLabelById[product.brandId] ?? product.brandId;

  const [activeImage, setActiveImage] = useState(gallery[0]);

  const similarProducts = useMemo(() => {
    return catalogProducts
      .filter(item => item.id !== product.id && (item.brandId === product.brandId || item.segment === product.segment))
      .slice(0, 4);
  }, [product]);

  const whatsappMessage = `Bonjour AfricaPhone, je suis intéressé par ${product.name} (${product.storage}) au prix de ${product.price}. Pouvez-vous me confirmer la disponibilité ?`;
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <Breadcrumb productName={product.name} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <GallerySection
            product={product}
            gallery={gallery}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
          />
          <OverviewPanel
            product={product}
            brandLabel={brandLabel}
            detailContent={detailContent}
            whatsappLink={whatsappLink}
          />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)]">
          <DescriptionSection product={product} description={detailContent.longDescription} />
          <SpecsSection specs={detailContent.specs} sellingPoints={detailContent.sellingPoints} />
        </div>

        <ServicesSection />

        {similarProducts.length > 0 && <SimilarProductsSection products={similarProducts} />}
      </div>
    </div>
  );
}

function Breadcrumb({ productName }: { productName: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="transition hover:text-slate-900">
            Accueil
          </Link>
        </li>
        <BreadcrumbDivider />
        <li>
          <Link href="/catalog" className="transition hover:text-slate-900">
            Catalogue
          </Link>
        </li>
        <BreadcrumbDivider />
        <li aria-current="page" className="font-semibold text-slate-900">
          {productName}
        </li>
      </ol>
    </nav>
  );
}

function BreadcrumbDivider() {
  return <li className="text-slate-400">/</li>;
}

type GallerySectionProps = {
  product: CatalogProduct;
  gallery: string[];
  activeImage: string;
  onSelectImage: (image: string) => void;
};

function GallerySection({ product, gallery, activeImage, onSelectImage }: GallerySectionProps) {
  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <div className="relative aspect-square bg-slate-100">
          <img src={activeImage} alt={`${product.name} - visuel`} className="h-full w-full object-cover" />
          <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Produit vérifié
          </span>
        </div>
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-3 overflow-x-auto">
          {gallery.map(image => (
            <button
              key={image}
              type="button"
              onClick={() => onSelectImage(image)}
              className={`h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border transition ${
                activeImage === image ? "border-slate-900 shadow-lg" : "border-slate-200 hover:border-slate-400"
              }`}
              aria-label="Voir l’aperçu"
            >
              <img src={image} alt="Miniature produit" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

type OverviewPanelProps = {
  product: CatalogProduct;
  brandLabel: string;
  detailContent: ReturnType<typeof buildProductDetailContent>;
  whatsappLink: string;
};

function OverviewPanel({ product, brandLabel, detailContent, whatsappLink }: OverviewPanelProps) {
  const montlyEstimate = product.priceValue > 0 ? Math.round(product.priceValue / 6) : undefined;

  return (
    <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl lg:sticky lg:top-12">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {brandLabel}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{product.name}</h1>
        {product.highlight && (
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-500">
            <SparkIcon className="h-4 w-4 text-orange-500" />
            {product.highlight}
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prix boutique</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{product.price}</p>
        {montlyEstimate && (
          <p className="mt-2 text-sm text-slate-500">
            ou {formatCurrency(montlyEstimate)} sur 6 échéances via nos partenaires
          </p>
        )}
        {product.storage && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <ChipIcon className="h-4 w-4 text-slate-500" />
            {product.storage}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600"
        >
          <WhatsappIcon className="h-5 w-5 text-white" />
          Commander sur WhatsApp
        </a>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <PhoneIcon className="h-5 w-5 text-slate-500" />
          Appeler la boutique ({STORE_PHONE})
        </button>
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pourquoi acheter chez AfricaPhone ?</p>
        <ul className="space-y-2 text-sm text-slate-600">
          {detailContent.sellingPoints.slice(0, 3).map(point => (
            <li key={point} className="flex items-start gap-2">
              <CheckIcon className="mt-1 h-4 w-4 text-emerald-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function DescriptionSection({ product, description }: { product: CatalogProduct; description: string }) {
  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">À propos du {product.name}</h2>
        <p className="text-sm text-slate-500">
          AfricaPhone vérifie chaque produit avant expédition. Nous préparons l’appareil, appliquons les mises à jour et
          restons disponibles pour l’assistance après l’achat.
        </p>
      </header>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}

function SpecsSection({
  specs,
  sellingPoints,
}: {
  specs: { label: string; value: string }[];
  sellingPoints: string[];
}) {
  return (
    <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Caractéristiques clés</h3>
        <dl className="mt-4 space-y-3 text-sm">
          {specs.map(spec => (
            <div key={`${spec.label}-${spec.value}`} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">{spec.label}</dt>
              <dd className="text-right font-semibold text-slate-900">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Les plus AfricaPhone</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {sellingPoints.map(point => (
            <li key={point} className="flex items-start gap-2">
              <StarIcon className="mt-1 h-4 w-4 text-orange-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ServicesSection() {
  return (
    <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Services inclus</p>
          <h2 className="text-2xl font-bold text-slate-900">AfricaPhone vous accompagne après l’achat</h2>
          <p className="text-sm text-slate-600">
            Nous gérons la configuration, restons disponibles pour le SAV et proposons des solutions
            de financement adaptées à votre budget.
          </p>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-3">
          {SERVICE_CARDS.map(card => (
            <div
              key={card.title}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <card.icon className="h-6 w-6 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
              <p className="text-xs text-slate-500">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SimilarProductsSection({ products }: { products: CatalogProduct[] }) {
  return (
    <section className="mt-12 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vous pourriez aussi aimer</p>
          <h2 className="text-lg font-semibold text-slate-900">Autres produits à découvrir</h2>
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Revenir au catalogue
          <ArrowIcon className="h-4 w-4 text-slate-500" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map(product => (
          <Link
            key={product.id}
            href={`/catalog/${encodeURIComponent(product.id)}`}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-44 bg-slate-100">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 py-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.segment}</span>
              <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
              {product.highlight && <p className="text-xs text-slate-500">{product.highlight}</p>}
              <p className="text-sm font-bold text-slate-900">{product.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M7.5 4.167 12.333 9 7.5 13.833"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5 13.8 8h4.7l-3.8 2.8 1.5 4.6L12 13.3l-4.2 2.1 1.5-4.6L5.5 8h4.7L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3.5 7h11v8H3.5V7Zm11 3h3l3 3v2h-6v-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 18.5c.966 0 1.75-.784 1.75-1.75s-.784-1.75-1.75-1.75-1.75.784-1.75 1.75.784 1.75 1.75 1.75Zm9 0c.966 0 1.75-.784 1.75-1.75s-.784-1.75-1.75-1.75-1.75.784-1.75 1.75.784 1.75 1.75 1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="m12 21.5 6.5-3.25v-9.75L12 2.5 5.5 8.5v9.75L12 21.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5 11 14l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="m10 2.5 1.9 4.34 4.6.36-3.5 3.02 1.06 4.48L10 12.9 5.94 14.7 7 10.22l-3.5-3.02 4.6-.36L10 2.5Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="m5 10.5 2.667 2.667L15 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4.167 6A1.833 1.833 0 0 1 6 4.167h8A1.833 1.833 0 0 1 15.833 6v8A1.833 1.833 0 0 1 14 15.833H6A1.833 1.833 0 0 1 4.167 14V6Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7.5 7.5h5v5h-5v-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M6.625 3h6.75A1.625 1.625 0 0 1 15 4.625v10.75A1.625 1.625 0 0 1 13.375 17h-6.75A1.625 1.625 0 0 1 5 15.375V4.625A1.625 1.625 0 0 1 6.625 3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 14.167h1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 20.5c4.69 0 8.5-3.692 8.5-8.25S16.69 4 12 4 3.5 7.692 3.5 12.25c0 1.427.382 2.77 1.05 3.935L3.5 21l5.019-1.64A8.716 8.716 0 0 0 12 20.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.667 13.833c-.19.535-1.074 1.05-1.537 1.05-.462 0-.838.272-2.575-.868-1.737-1.14-2.77-2.997-2.857-3.159-.086-.163-.755-1.35-.755-2.146 0-.797.417-1.177.564-1.339.147-.163.326-.204.435-.204.109 0 .218.002.317.007.198.01.297.02.43.337.163.392.556 1.36.606 1.459.05.098.083.212.016.345-.068.132-.101.212-.2.326-.099.114-.21.248-.301.334-.099.094-.203.196-.099.386.104.19.462.81.991 1.312.68.652 1.254.859 1.446.955.191.095.309.082.425-.05.116-.134.49-.567.622-.758.132-.19.257-.16.43-.095.173.066 1.11.55 1.3.65.19.099.316.147.363.229.047.083.047.546-.144 1.082Z"
        fill="currentColor"
      />
    </svg>
  );
}
