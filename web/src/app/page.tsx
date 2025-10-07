'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  allProducts,
  brandHighlights,
  type BrandHighlight,
  type ProductSummary,
} from "@/data/home";

export default function Home() {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const brandLookup = useMemo(
    () =>
      brandHighlights.reduce<Record<string, BrandHighlight>>((acc, brand) => {
        acc[brand.id] = brand;
        return acc;
      }, {}),
    []
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return allProducts.filter(product => {
      const matchesBrand = activeBrand ? product.brandId === activeBrand : true;
      const matchesQuery =
        normalizedQuery.length === 0
          ? true
          : [product.name, product.category, product.description, product.specs ?? "", product.highlight ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);
      return matchesBrand && matchesQuery;
    });
  }, [activeBrand, searchTerm]);

  const activeBrandName = activeBrand ? brandLookup[activeBrand]?.name ?? null : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 lg:px-8">
        <BrandGallery activeBrand={activeBrand} onSelectBrand={setActiveBrand} />
        <ProductExplorer
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          products={filteredProducts}
          activeBrandName={activeBrandName}
          resetBrandFilter={() => setActiveBrand(null)}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          AfricaPhone
        </Link>
        <p className="hidden text-sm font-medium text-slate-500 md:block">
          Smartphones · Tablettes · Accessoires · Services
        </p>
        <Link
          href="#products"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Voir les produits
        </Link>
      </div>
    </header>
  );
}

function BrandGallery({
  activeBrand,
  onSelectBrand,
}: {
  activeBrand: string | null;
  onSelectBrand: (brandId: string | null) => void;
}) {
  return (
    <section id="marques" className="space-y-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {brandHighlights.map(brand => {
          const isActive = brand.id === activeBrand;
          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => onSelectBrand(isActive ? null : brand.id)}
              className={`relative flex min-w-[110px] cursor-pointer flex-col items-center gap-2 rounded-2xl px-4 py-3 transition ${
                isActive ? "bg-white shadow-md ring-2 ring-slate-900/80" : "bg-white/70 hover:bg-white"
              }`}
            >
              <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white">
                <img src={brand.logoUrl} alt={`Logo ${brand.name}`} className="h-full w-full object-cover" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{brand.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProductExplorer({
  searchTerm,
  onSearchTermChange,
  products,
  activeBrandName,
  resetBrandFilter,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  products: ProductSummary[];
  activeBrandName: string | null;
  resetBrandFilter: () => void;
}) {
  return (
    <section id="products" className="space-y-6">
      <div className="relative">
        <input
          type="search"
          value={searchTerm}
          onChange={event => onSearchTermChange(event.target.value)}
          placeholder="Rechercher un smartphone, une tablette, un accessoire..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
      </div>
      {activeBrandName && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={resetBrandFilter}
            className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-300"
          >
            {activeBrandName}
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Aucun produit ne correspond pour le moment. Essayez un autre mot-clé ou réinitialisez les filtres.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {products.map(product => (
            <article
              key={product.id}
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-48 w-full bg-slate-100">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.category}</span>
                  <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                </div>
                <p className="text-sm text-slate-600">{product.description}</p>
                {product.highlight && <p className="text-xs font-semibold text-slate-500">{product.highlight}</p>}
                {product.specs && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Fiche technique :</span> {product.specs}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-base font-semibold text-slate-900">{product.price}</span>
                  <Link href="#details" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Plus d’infos
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-600 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-base font-semibold text-slate-900">
            AfricaPhone
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link href="#marques" className="hover:text-slate-900">
              Marques
            </Link>
            <Link href="#products" className="hover:text-slate-900">
              Produits
            </Link>
            <Link href="#contact" className="hover:text-slate-900">
              Contact
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AfricaPhone. Tous droits réservés.</p>
          <p>
            Retrouvez-nous sur <span className="font-medium text-slate-700">WhatsApp</span> &{" "}
            <span className="font-medium text-slate-700">Facebook</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
