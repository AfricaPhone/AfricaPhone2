'use client';
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  PRICE_RANGES,
  brandOptions,
  catalogProducts,
  categoryOptions,
  segmentOptions,
  type CatalogProduct,
  type PriceRange,
  formatCurrency,
} from "@/data/catalog";

const QUICK_SEARCHES = [
  { label: "5G", query: "5G" },
  { label: "Photographie", query: "108 MP" },
  { label: "Autonomie XXL", query: "5000" },
  { label: "Tablettes", query: "Tablette" },
  { label: "Accessoires", query: "Accessoire" },
] as const;

type ViewMode = "grid" | "list";
type SortOption = "relevance" | "priceAsc" | "priceDesc";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "priceAsc", label: "Prix croissant" },
  { key: "priceDesc", label: "Prix décroissant" },
];

const PRICE_RANGE_MAP = new Map(PRICE_RANGES.map(range => [range.key, range]));

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeSegment, setActiveSegment] = useState<string>(segmentOptions[0]);
  const [priceKey, setPriceKey] = useState<string | null>(null);
  const [customMin, setCustomMin] = useState<string>("");
  const [customMax, setCustomMax] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(current =>
      current.includes(brandId) ? current.filter(id => id !== brandId) : [...current, brandId],
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(current =>
      current.includes(categoryId) ? current.filter(id => id !== categoryId) : [...current, categoryId],
    );
  };

  const handleSelectPriceRange = (range: PriceRange) => {
    setPriceKey(prev => (prev === range.key ? null : range.key));
    setCustomMin("");
    setCustomMax("");
  };

  const handleCustomMinChange = (value: string) => {
    setPriceKey(null);
    setCustomMin(sanitizeDigits(value));
  };

  const handleCustomMaxChange = (value: string) => {
    setPriceKey(null);
    setCustomMax(sanitizeDigits(value));
  };

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setActiveSegment(segmentOptions[0]);
    setPriceKey(null);
    setCustomMin("");
    setCustomMax("");
  };

  const query = searchTerm.trim().toLowerCase();
  const priceRange = priceKey ? PRICE_RANGE_MAP.get(priceKey) : undefined;
  const minValue = customMin ? Number(customMin) : priceRange?.min;
  const maxValue = customMax ? Number(customMax) : priceRange?.max;

  const filteredProducts = useMemo(() => {
    const filtered = catalogProducts.filter(product => {
      if (query && !product.searchText.includes(query)) {
        return false;
      }

      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brandId)) {
        return false;
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false;
      }

      if (activeSegment !== segmentOptions[0] && product.segment !== activeSegment) {
        return false;
      }

      if (minValue !== undefined && product.priceValue < minValue) {
        return false;
      }

      if (maxValue !== undefined && product.priceValue > maxValue) {
        return false;
      }

      return true;
    });

    if (sortOption === "relevance") {
      return filtered;
    }

    const sorted = filtered.slice();

    if (sortOption === "priceAsc") {
      sorted.sort((a, b) => a.priceValue - b.priceValue);
    } else if (sortOption === "priceDesc") {
      sorted.sort((a, b) => b.priceValue - a.priceValue);
    }

    return sorted;
  }, [
    activeSegment,
    maxValue,
    minValue,
    query,
    selectedBrands,
    selectedCategories,
    sortOption,
  ]);

  const activeFiltersCount =
    selectedBrands.length +
    selectedCategories.length +
    (activeSegment !== segmentOptions[0] ? 1 : 0) +
    (priceKey ? 1 : 0) +
    (customMin ? 1 : 0) +
    (customMax ? 1 : 0);

  const activeChips = buildActiveChips({
    selectedBrands,
    selectedCategories,
    activeSegment,
    priceKey,
    customMin,
    customMax,
    onToggleBrand: toggleBrand,
    onToggleCategory: toggleCategory,
    onSelectSegment: setActiveSegment,
    onSelectPriceKey: setPriceKey,
    onCustomMinChange: setCustomMin,
    onCustomMaxChange: setCustomMax,
  });

  const closeFilters = () => setIsFiltersOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <SearchHeader
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          activeSegment={activeSegment}
          onSelectSegment={setActiveSegment}
          onOpenFilters={() => setIsFiltersOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <aside className="hidden w-full max-w-xs shrink-0 md:block">
            <FiltersPanel
              selectedBrands={selectedBrands}
              selectedCategories={selectedCategories}
              activeSegment={activeSegment}
              priceKey={priceKey}
              customMin={customMin}
              customMax={customMax}
              onToggleBrand={toggleBrand}
              onToggleCategory={toggleCategory}
              onSelectSegment={setActiveSegment}
              onSelectPriceRange={handleSelectPriceRange}
              onCustomMinChange={handleCustomMinChange}
              onCustomMaxChange={handleCustomMaxChange}
              onReset={resetFilters}
              defaultSegment={segmentOptions[0]}
            />
          </aside>

          <ResultsArea
            products={filteredProducts}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            sortOption={sortOption}
            onSortChange={setSortOption}
            onOpenFilters={() => setIsFiltersOpen(true)}
            activeFiltersCount={activeFiltersCount}
            activeChips={activeChips}
            onResetFilters={resetFilters}
          />
        </div>
      </div>

      {isFiltersOpen && (
        <MobileFilters
          selectedBrands={selectedBrands}
          selectedCategories={selectedCategories}
          activeSegment={activeSegment}
          priceKey={priceKey}
          customMin={customMin}
          customMax={customMax}
          onToggleBrand={toggleBrand}
          onToggleCategory={toggleCategory}
          onSelectSegment={setActiveSegment}
          onSelectPriceRange={handleSelectPriceRange}
          onCustomMinChange={handleCustomMinChange}
          onCustomMaxChange={handleCustomMaxChange}
          onReset={resetFilters}
          onClose={closeFilters}
          defaultSegment={segmentOptions[0]}
          resultCount={filteredProducts.length}
        />
      )}
    </div>
  );
}

type FiltersPanelProps = {
  selectedBrands: string[];
  selectedCategories: string[];
  activeSegment: string;
  priceKey: string | null;
  customMin: string;
  customMax: string;
  onToggleBrand: (brandId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onSelectSegment: (segment: string) => void;
  onSelectPriceRange: (range: PriceRange) => void;
  onCustomMinChange: (value: string) => void;
  onCustomMaxChange: (value: string) => void;
  onReset: () => void;
  defaultSegment: string;
};

function FiltersPanel({
  selectedBrands,
  selectedCategories,
  activeSegment,
  priceKey,
  customMin,
  customMax,
  onToggleBrand,
  onToggleCategory,
  onSelectSegment,
  onSelectPriceRange,
  onCustomMinChange,
  onCustomMaxChange,
  onReset,
  defaultSegment,
}: FiltersPanelProps) {
  return (
    <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Filtres</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-orange-500 transition hover:text-orange-600"
        >
          Réinitialiser
        </button>
      </header>

      <FilterSection title="Catégories">
        <div className="flex flex-col gap-2">
          {categoryOptions.map(category => {
            const inputId = `category-${category.id}`;
            return (
              <label
                key={category.id}
                htmlFor={inputId}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => onToggleCategory(category.id)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                {category.label}
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Prix (FCFA)">
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map(range => {
            const isActive = priceKey === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => onSelectPriceRange(range)}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                  isActive
                    ? "border-orange-300 bg-orange-50 text-orange-600"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <span className="font-medium">{range.label}</span>
                {isActive && <SparkleIcon className="h-4 w-4 text-orange-500" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Personnaliser</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="price-min" className="text-xs font-semibold text-slate-500">
                Min
              </label>
              <input
                id="price-min"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customMin}
                onChange={event => onCustomMinChange(event.target.value)}
                placeholder="Ex: 50000"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="price-max" className="text-xs font-semibold text-slate-500">
                Max
              </label>
              <input
                id="price-max"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customMax}
                onChange={event => onCustomMaxChange(event.target.value)}
                placeholder="Ex: 150000"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Marques">
        <div className="grid grid-cols-2 gap-2">
          {brandOptions.map(brand => {
            const inputId = `brand-${brand.id}`;
            const selected = selectedBrands.includes(brand.id);
            return (
              <label
                key={brand.id}
                htmlFor={inputId}
                className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-orange-300 bg-orange-50 text-orange-600"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleBrand(brand.id)}
                  className="hidden"
                />
                {brand.label}
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Segments">
        <div className="flex flex-wrap gap-2">
          {segmentOptions.map(segment => {
            const isActive = activeSegment === segment;
            return (
              <button
                key={segment}
                type="button"
                onClick={() => onSelectSegment(segment)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {segment === defaultSegment ? "Tous" : segment}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type MobileFiltersProps = FiltersPanelProps & {
  onClose: () => void;
  resultCount: number;
};

function MobileFilters({ onClose, resultCount, ...panelProps }: MobileFiltersProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 md:hidden">
      <div className="absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col overflow-hidden rounded-l-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Filtres</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900"
            aria-label="Fermer"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <FiltersPanel {...panelProps} />
        </div>
        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            Voir {resultCount} résultat{resultCount > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

type SearchHeaderProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  activeSegment: string;
  onSelectSegment: (segment: string) => void;
  onOpenFilters: () => void;
  activeFiltersCount: number;
};

function SearchHeader({
  searchTerm,
  onSearchTermChange,
  activeSegment,
  onSelectSegment,
  onOpenFilters,
  activeFiltersCount,
}: SearchHeaderProps) {
  return (
    <header className="space-y-6 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
          <SearchIcon className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={event => onSearchTermChange(event.target.value)}
            placeholder="Rechercher un produit, une catégorie, un mot-clé…"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => onSearchTermChange("")}
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:block"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <SparkleIcon className="h-4 w-4 text-orange-500" />
          Suggestions rapides
        </span>
        {QUICK_SEARCHES.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSearchTermChange(item.query)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-orange-300 hover:text-orange-500"
          >
            {item.label}
          </button>
        ))}
      </div>

      <nav className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500 md:pt-5">
        {segmentOptions.map(segment => {
          const isActive = activeSegment === segment;
          return (
            <button
              key={segment}
              type="button"
              onClick={() => onSelectSegment(segment)}
              className={`rounded-full px-4 py-2 transition ${
                isActive ? "bg-orange-500 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {segment}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

type ResultsAreaProps = {
  products: CatalogProduct[];
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  onOpenFilters: () => void;
  activeFiltersCount: number;
  activeChips: ActiveChip[];
  onResetFilters: () => void;
};

function ResultsArea({
  products,
  viewMode,
  onChangeViewMode,
  sortOption,
  onSortChange,
  onOpenFilters,
  activeFiltersCount,
  activeChips,
  onResetFilters,
}: ResultsAreaProps) {
  return (
    <section className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Résultats
          </span>
          <p className="text-sm font-medium text-slate-600">
            {products.length} produit{products.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
            <label htmlFor="catalog-sort" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Trier
            </label>
            <select
              id="catalog-sort"
              value={sortOption}
              onChange={event => onSortChange(event.target.value as SortOption)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-slate-600">
            <button
              type="button"
              onClick={() => onChangeViewMode("grid")}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                viewMode === "grid" ? "bg-slate-900 text-white" : "hover:text-slate-900"
              }`}
            >
              <GridIcon className="h-4 w-4" />
              Grille
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("list")}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                viewMode === "list" ? "bg-slate-900 text-white" : "hover:text-slate-900"
              }`}
            >
              <ListIcon className="h-4 w-4" />
              Liste
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFilters}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeChips.length > 0 && <ActiveFiltersChips chips={activeChips} onReset={onResetFilters} />}

      {products.length === 0 ? (
        <EmptyState onReset={onResetFilters} />
      ) : (
        <ProductResults products={products} viewMode={viewMode} />
      )}
    </section>
  );
}

function ProductResults({ products, viewMode }: { products: CatalogProduct[]; viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {products.map(product => (
          <ProductListItem key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {products.map(product => (
        <ProductGridItem key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductGridItem({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <img src={product.image} alt={product.name} className="h-40 w-full object-cover" />
        <button
          type="button"
          aria-label="Ajouter aux favoris"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow"
        >
          <HeartIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.category}</p>
        <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
        <p className="text-xs font-medium text-slate-500">{product.storage}</p>
        {product.highlight && (
          <p className="flex items-center gap-1 text-xs font-medium text-orange-500">
            <LightningIcon className="h-4 w-4 text-orange-500" />
            {product.highlight}
          </p>
        )}
        <p className="text-lg font-bold text-slate-900">{product.price}</p>
      </div>
    </article>
  );
}

function ProductListItem({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:gap-6">
      <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-slate-100 sm:h-32 sm:w-32">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <button
          type="button"
          aria-label="Ajouter aux favoris"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow"
        >
          <HeartIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.category}</p>
          <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
          <p className="text-sm text-slate-500">{product.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {product.storage}
          </span>
          {product.highlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-500">
              <LightningIcon className="h-3.5 w-3.5 text-orange-500" />
              {product.highlight}
            </span>
          )}
          <span className="text-lg font-bold text-slate-900">{product.price}</span>
        </div>
      </div>
    </article>
  );
}

function ActiveFiltersChips({ chips, onReset }: { chips: ActiveChip[]; onReset: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <button
          key={`${chip.type}-${chip.value}`}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100"
        >
          {chip.label}
          <CloseIcon className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        Effacer les filtres
      </button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
        <SearchIcon className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-800">Aucun produit trouvé</h3>
        <p className="max-w-sm text-sm text-slate-500">
          Ajustez votre recherche ou relancez une nouvelle exploration du catalogue AfricaPhone.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

type ActiveChipsArgs = {
  selectedBrands: string[];
  selectedCategories: string[];
  activeSegment: string;
  priceKey: string | null;
  customMin: string;
  customMax: string;
  onToggleBrand: (brandId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onSelectSegment: (segment: string) => void;
  onSelectPriceKey: (key: string | null) => void;
  onCustomMinChange: (value: string) => void;
  onCustomMaxChange: (value: string) => void;
};

type ActiveChip = {
  type: string;
  value: string;
  label: string;
  onRemove: () => void;
};

function buildActiveChips({
  selectedBrands,
  selectedCategories,
  activeSegment,
  priceKey,
  customMin,
  customMax,
  onToggleBrand,
  onToggleCategory,
  onSelectSegment,
  onSelectPriceKey,
  onCustomMinChange,
  onCustomMaxChange,
}: ActiveChipsArgs): ActiveChip[] {
  const chips: ActiveChip[] = [];

  selectedBrands.forEach(brandId => {
    const brand = brandOptions.find(item => item.id === brandId);
    chips.push({
      type: "brand",
      value: brandId,
      label: brand?.label ?? brandId,
      onRemove: () => onToggleBrand(brandId),
    });
  });

  selectedCategories.forEach(categoryId => {
    const category = categoryOptions.find(item => item.id === categoryId);
    chips.push({
      type: "category",
      value: categoryId,
      label: category?.label ?? categoryId,
      onRemove: () => onToggleCategory(categoryId),
    });
  });

  if (activeSegment !== segmentOptions[0]) {
    chips.push({
      type: "segment",
      value: activeSegment,
      label: activeSegment,
      onRemove: () => onSelectSegment(segmentOptions[0]),
    });
  }

  if (priceKey) {
    const range = PRICE_RANGE_MAP.get(priceKey);
    if (range) {
      chips.push({
        type: "priceRange",
        value: priceKey,
        label: range.label,
        onRemove: () => onSelectPriceKey(null),
      });
    }
  }

  if (customMin) {
    const amount = Number(customMin);
    if (!Number.isNaN(amount)) {
      chips.push({
        type: "minPrice",
        value: customMin,
        label: `Min ${formatCurrency(amount)}`,
        onRemove: () => onCustomMinChange(""),
      });
    }
  }

  if (customMax) {
    const amount = Number(customMax);
    if (!Number.isNaN(amount)) {
      chips.push({
        type: "maxPrice",
        value: customMax,
        label: `Max ${formatCurrency(amount)}`,
        onRemove: () => onCustomMaxChange(""),
      });
    }
  }

  return chips;
}

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
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

function SparkleIcon({ className }: { className?: string }) {
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

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4 4h4v4H4V4ZM12 4h4v4h-4V4ZM4 12h4v4H4v-4ZM12 12h4v4h-4v-4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4.5 6.5h11M4.5 10h11M4.5 13.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
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

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 17.25c-.267 0-.534-.083-.758-.25C7.592 15.842 4 13.117 4 9.5 4 7.143 5.893 5.25 8.25 5.25c.943 0 1.86.321 2.6.907a3.353 3.353 0 0 1 2.6-.907C15.107 5.25 17 7.143 17 9.5c0 3.617-3.592 6.342-5.242 7.5-.224.167-.491.25-.758.25Z" />
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
