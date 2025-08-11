import { DimensionValue } from 'react-native';

export type Category = string;

export type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  category: Category;
  rating?: number;
  description?: string;
};

// --- Brand ---
export type Brand = {
  id: string;
  name: string;
  logoUrl: string;
  sortOrder: number;
};

// --- User ---
export type User = {
  id: string;
  name: string;
  email: string | null;
  phoneNumber?: string | null; // Ajout de la propriété optionnelle
  initials: string;
};

// --- Favorites / Collections ---

export type FavoriteCollection = {
  id: string;
  name: string;
  productIds: Set<string>; // Using a Set for efficient add/delete
};

export type FavoritesState = Record<string, FavoriteCollection>;


// --- Discover Feed Types ---

export type HeroItem = {
  type: 'hero';
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  cta: string; // Call to action text
};

export type ProductGridItem = {
  type: 'product_grid';
  id: string;
  title: string;
  productIds: string[];
};

export type CollectionItem = {
  type: 'collection';
  id: string;
  title: string;
  productIds: string[];
};

export type ShopTheLookItem = {
  type: 'shop_the_look';
  id: string;
  imageUrl: string;
  markers: Array<{
    productId: string;
    top: DimensionValue; // e.g., '30%'
    left: DimensionValue; // e.g., '50%'
  }>;
};

export type ArticleItem = {
  type: 'article';
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
};

export type DiscoverFeedItem = HeroItem | ProductGridItem | CollectionItem | ShopTheLookItem | ArticleItem;


// --- Navigation Types ---

export type RootStackParamList = {
  Main: undefined; // This will render the MainStack navigator
  ProductDetail: { productId: string };
  Cart: undefined;
};

// This is for the navigator that wraps the tabs
export type MainStackParamList = {
  Tabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Discover: undefined;
  Catalog: { category?: Category } | undefined;
  Favorites: undefined;
  Profile: undefined;
};
