import { searchClient as createSearchClient } from '@algolia/client-search';

export const MIN_ALGOLIA_TERM_LENGTH = 2;

export const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
export const ALGOLIA_SEARCH_API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '';
export const ALGOLIA_INDEX_NAME = 'products';

export const ALGOLIA_ATTRIBUTES_TO_RETRIEVE = [
  'name',
  'brand',
  'description',
  'price',
  'imageUrl',
  'imageUrls',
  'ordreVedette',
  'rom',
  'ram',
  'tags',
  'category',
  'segment',
  'type',
  'enPromotion',
] as const;

export const algoliaClient = createSearchClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);

export type AlgoliaProductHit = {
  objectID: string;
  name?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  imageUrls?: unknown;
  brand?: unknown;
  description?: unknown;
  rom?: unknown;
  ram?: unknown;
  enPromotion?: unknown;
  ordreVedette?: unknown;
  category?: unknown;
  segment?: unknown;
  tags?: unknown;
  type?: unknown;
};

