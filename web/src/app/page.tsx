'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  allProducts,
  brandHighlights,
  productSegments,
  promoCards,
  type ProductSummary,
} from "@/data/home";

const NAV_ITEMS = [
  { label: "Accueil", icon: HomeIcon, active: true },
  { label: "Recherche", icon: SearchIcon, active: false },
  { label: "Favoris", icon: HeartOutlineIcon, active: false },
  { label: "Profil", icon: UserIcon, active: false },
] as const;

const BRAND_INFO = new Map(brandHighlights.map(brand => [brand.id, brand]));

export default function Home() {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<(typeof productSegments)[number]>(productSegments[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return allProducts.filter(product => {
      const matchesSegment = product.segment === activeSegment;
      const matchesBrand = activeBrand ? product.brandId === activeBrand : true;
      const matchesQuery =
        query.length === 0
          ? true
          : [product.name, product.description, product.storage, product.highlight ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(query);
      return matchesSegment && matchesBrand && matchesQuery;
    });
  }, [activeSegment, activeBrand, searchTerm]);

  const closeProductDetail = () => setSelectedProduct(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.18)] md:max-w-none md:min-h-screen md:rounded-none md:border-none md:shadow-none">
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:px-12 md:pb-16 md:pt-10 lg:px-16">
          <SearchRow searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
          <BrandRow activeBrand={activeBrand} onSelectBrand={setActiveBrand} />
          <SegmentTabs activeSegment={activeSegment} onSelectSegment={setActiveSegment} />
          <PromoCarousel />
          <ProductGrid products={filteredProducts} onSelectProduct={setSelectedProduct} />
        </main>
        <BottomNav />
      </div>
      {selectedProduct && (
        <ProductDetailSheet
          product={selectedProduct}
          onClose={closeProductDetail}
        />
      )}
    </div>
  );
}

function SearchRow({
  searchTerm,
  onSearchTermChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 py-3">
        <SearchIcon className="h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={event => onSearchTermChange(event.target.value)}
          placeholder="Rechercher"
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>
      <button
        type="button"
        className="flex h-11 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm"
      >
        <FilterIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function SegmentTabs({
  activeSegment,
  onSelectSegment,
}: {
  activeSegment: (typeof productSegments)[number];
  onSelectSegment: (segment: (typeof productSegments)[number]) => void;
}) {
  return (
    <div className="mt-5 flex gap-5 overflow-x-auto pb-2 text-sm font-semibold text-slate-500 md:grid md:grid-flow-col md:auto-cols-fr md:gap-8 md:overflow-visible">
      {productSegments.map(segment => {
        const isActive = segment === activeSegment;
        return (
          <button
            key={segment}
            type="button"
            onClick={() => onSelectSegment(segment)}
            className={`relative pb-2 transition ${isActive ? "text-orange-500" : "text-slate-500"}`}
          >
            {segment}
            {isActive && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-orange-500" />}
          </button>
        );
      })}
    </div>
  );
}

function BrandRow({
  activeBrand,
  onSelectBrand,
}: {
  activeBrand: string | null;
  onSelectBrand: (brandId: string | null) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-4 overflow-x-auto pb-2 md:grid md:grid-flow-col md:auto-cols-fr md:items-start md:gap-8 md:overflow-visible">
      {brandHighlights.map(brand => {
        const isActive = brand.id === activeBrand;
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => onSelectBrand(isActive ? null : brand.id)}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                isActive ? "border-orange-500" : "border-transparent"
              }`}
              style={{ boxShadow: isActive ? "0 8px 18px rgba(249,115,22,0.35)" : "0 6px 12px rgba(15,23,42,0.1)" }}
            >
              <img src={brand.logoUrl} alt={brand.name} className="h-[58px] w-[58px] rounded-full object-cover" />
            </span>
            <span className="text-xs font-medium text-slate-600">{brand.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PromoCarousel() {
  if (promoCards.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-1">
      {promoCards.map(card => (
        <article
          key={card.id}
          className="relative min-w-[240px] overflow-hidden rounded-3xl"
          style={{ boxShadow: "0 16px 30px rgba(15,23,42,0.18)" }}
        >
          <img src={card.image} alt={card.title} className="h-32 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />
          <div className="absolute inset-0 flex flex-col justify-end gap-2 px-4 pb-4 text-white">
            {card.badge && (
              <span className="w-fit rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {card.badge}
              </span>
            )}
            <h3 className="text-sm font-semibold leading-tight">{card.title}</h3>
            <p className="text-xs text-white/80">{card.description}</p>
            <button
              type="button"
              className="w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900"
            >
              {card.ctaLabel}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductGrid({
  products,
  onSelectProduct,
}: {
  products: ProductSummary[];
  onSelectProduct: (product: ProductSummary) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Aucun produit pour le moment dans cette catégorie.
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map(product => (
        <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: ProductSummary;
  onSelect: (product: ProductSummary) => void;
}) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(product);
    }
  };

  return (
    <article
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        <img src={product.image} alt={product.name} className="h-36 w-full object-cover md:h-44" />
        <button
          type="button"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"
          aria-label="Ajouter aux favoris"
        >
          <HeartIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
        <p className="text-xs font-medium text-slate-500">{product.storage}</p>
        {product.highlight && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <LightningIcon className="h-3.5 w-3.5 text-orange-500" />
            {product.highlight}
          </p>
        )}
        <p className="pt-1 text-lg font-bold text-slate-900">{product.price}</p>
      </div>
    </article>
  );
}

function ProductDetailSheet({
  product,
  onClose,
}: {
  product: ProductSummary;
  onClose: () => void;
}) {
  const brandInfo = BRAND_INFO.get(product.brandId);
  const brandLabel = brandInfo?.name ?? product.brandId;
  const tagline = brandInfo?.tagline;

  const featureCandidates = [
    product.highlight,
    product.storage ? `Stockage ${product.storage}` : null,
    tagline,
    "Livraison partout au Bénin",
    "Assistance après-vente AfricaPhone",
  ].filter((item): item is string => Boolean(item));

  const features = Array.from(new Set(featureCandidates));

  const specs = [
    { label: "Segment", value: product.segment },
    { label: "Catégorie", value: product.category },
    { label: "Marque", value: brandLabel },
    product.storage ? { label: "Capacité", value: product.storage } : null,
  ].filter((spec): spec is { label: string; value: string } => Boolean(spec?.value));

  const whatsappMessage = `Bonjour AfricaPhone, je suis intéressé par ${product.name} (${product.storage ?? "configuration standard"}). Pouvez-vous me confirmer la disponibilité ?`;
  const whatsappLink = `https://wa.me/22961000000?text=${encodeURIComponent(whatsappMessage)}`;

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-4 py-8 md:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:max-w-4xl"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow hover:text-slate-900"
          aria-label="Fermer la fiche produit"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative bg-slate-100">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-5 p-6 md:p-8">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {brandLabel}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{product.name}</h2>
              {tagline && <p className="text-sm text-slate-500">{tagline}</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prix boutique</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{product.price}</p>
            </div>

            <p className="text-sm leading-6 text-slate-600">{product.description}</p>

            {features.length > 0 && (
              <ul className="space-y-2 text-sm text-slate-600">
                {features.map(feature => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="mt-1 h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {specs.length > 0 && (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {specs.map(spec => (
                  <div key={`${spec.label}-${spec.value}`} className="rounded-xl border border-slate-200 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{spec.label}</dt>
                    <dd className="text-sm font-semibold text-slate-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600"
              >
                <WhatsappIcon className="h-5 w-5 text-white" />
                Discuter sur WhatsApp
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="grid grid-cols-4 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500 md:hidden">
      {NAV_ITEMS.map(item => (
        <button
          key={item.label}
          type="button"
          className={`flex flex-col items-center gap-1 ${
            item.active ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}


function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.583 15.417c3.227 0 5.834-2.607 5.834-5.834 0-3.226-2.607-5.833-5.834-5.833-3.226 0-5.833 2.607-5.833 5.833 0 3.227 2.607 5.834 5.833 5.834Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.167 14.167 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4.167 5H15.833M6.667 10H13.333M8.75 15h2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 17.25c-.267 0-.534-.083-.758-.25C7.592 15.842 4 13.117 4 9.5 4 7.143 5.893 5.25 8.25 5.25c.943 0 1.86.321 2.6.907a3.353 3.353 0 0 1 2.6-.907C15.107 5.25 17 7.143 17 9.5c0 3.617-3.592 6.342-5.242 7.5-.224.167-.491.25-.758.25Z" />
    </svg>
  );
}

function HeartOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 16.75c-.2 0-.398-.062-.566-.187C8.079 15.476 4.667 12.933 4.667 9.5c0-2.3 1.867-4.167 4.166-4.167.984 0 1.909.344 2.667.969.758-.625 1.683-.969 2.667-.969 2.299 0 4.166 1.867 4.166 4.167 0 3.433-3.412 5.976-4.767 7.063-.168.125-.366.187-.566.187Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="m6 6 8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
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

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.5 2a.5.5 0 0 1 .48.363L11 6h4.5a.5.5 0 0 1 .39.812l-6 7.5a.5.5 0 0 1-.89-.36l.77-4.452H5a.5.5 0 0 1-.47-.662l3-8A.5.5 0 0 1 8 0h1.5Z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3.333 7.667 10 2l6.667 5.667v8a1.333 1.333 0 0 1-1.334 1.333h-10a1.333 1.333 0 0 1-1.333-1.333v-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 17.333V10h5v7.333" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 10c2.025 0 3.667-1.642 3.667-3.667C13.667 4.308 12.025 2.667 10 2.667 7.975 2.667 6.333 4.308 6.333 6.333 6.333 8.358 7.975 10 10 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.167 17.333c0-2.683 2.15-4.833 4.833-4.833h2c2.683 0 4.833 2.15 4.833 4.833"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
