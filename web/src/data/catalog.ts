import {
  allProducts,
  brandHighlights,
  productSegments,
  type ProductSummary,
} from "./home";

export type PriceRange = {
  key: string;
  label: string;
  min?: number;
  max?: number;
};

export const PRICE_RANGES: PriceRange[] = [
  { key: "under_50k", label: "- 50 000 FCFA", max: 50_000 },
  { key: "50k_100k", label: "50 000 - 100 000 FCFA", min: 50_000, max: 100_000 },
  { key: "100k_150k", label: "100 000 - 150 000 FCFA", min: 100_000, max: 150_000 },
  { key: "150k_250k", label: "150 000 - 250 000 FCFA", min: 150_000, max: 250_000 },
  { key: "250k_500k", label: "250 000 - 500 000 FCFA", min: 250_000, max: 500_000 },
  { key: "over_500k", label: "+ 500 000 FCFA", min: 500_000 },
];

const brandNameFromHighlights = new Map(
  brandHighlights.map(brand => [brand.id, brand.name]),
);

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const brandOptions = Array.from(
  new Set(allProducts.map(product => product.brandId)),
).map(brandId => ({
  id: brandId,
  label: brandNameFromHighlights.get(brandId) ?? toTitleCase(brandId),
}));

brandOptions.sort((a, b) => a.label.localeCompare(b.label));

export const categoryOptions = Array.from(
  new Set(allProducts.map(product => product.category)),
).map(category => ({
  id: category,
  label: category,
}));

categoryOptions.sort((a, b) => a.label.localeCompare(b.label));

export const segmentOptions = ["Tous", ...productSegments];

export type CatalogProduct = ProductSummary & {
  priceValue: number;
  searchText: string;
};

export const catalogProducts: CatalogProduct[] = allProducts.map(product => {
  const priceValue = parsePriceValue(product.price);
  const searchText = [product.name, product.description, product.storage, product.highlight ?? ""]
    .join(" ")
    .toLowerCase();

  return {
    ...product,
    priceValue,
    searchText,
  };
});

export function parsePriceValue(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
