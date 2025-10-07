'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
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

export default function Home() {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<(typeof productSegments)[number]>(productSegments[0]);
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.18)] md:max-w-none md:min-h-screen md:rounded-none md:border-none md:shadow-none">
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:px-12 md:pb-16 md:pt-10 lg:px-16">
          <SearchRow searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
          <BrandRow activeBrand={activeBrand} onSelectBrand={setActiveBrand} />
          <SegmentTabs activeSegment={activeSegment} onSelectSegment={setActiveSegment} />
          <PromoCarousel />
          <ProductGrid products={filteredProducts} />
        </main>
        <BottomNav />
      </div>
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
    <div className="mt-5 flex gap-5 overflow-x-auto pb-2 text-sm font-semibold text-slate-500 md:flex-wrap md:gap-8 md:overflow-visible">
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

function ProductGrid({ products }: { products: ProductSummary[] }) {
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
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
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
