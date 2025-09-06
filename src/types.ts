// src/types.ts
import { DimensionValue } from 'react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Segment } from './screens/home/ProductSegments';

export type Category = string;

export type Specification = {
  key: string;
  value: string;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  imageUrls?: string[];
  blurhash?: string;
  category: Category;
  description?: string;
  rom?: number;
  ram?: number;
  ram_base?: number;
  ram_extension?: number;
  ordreVedette?: number;
  specifications?: Specification[];
  enPromotion?: boolean;
  isVedette?: boolean;
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
  firstName?: string;
  lastName?: string;
  email: string | null;
  phoneNumber?: string | null;
  initials: string;
  pushTokens?: string[];
};

// --- Favorites / Collections ---
export type FavoriteCollection = {
  id: string;
  name: string;
  productIds: Set<string>;
};

export type FavoritesState = Record<string, FavoriteCollection>;

// --- Discover Feed Types ---
export type HeroItem = {
  type: 'hero';
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  cta: string;
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
    top: DimensionValue;
    left: DimensionValue;
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
export type FilterOptions = {
  searchQuery?: string;
  category?: Category;
  brands?: Brand[];
  minPrice?: string;
  maxPrice?: string;
  enPromotion?: boolean;
  isVedette?: boolean;
  rom?: number;
  ram?: number;
};

export type RootStackParamList = {
  Main: undefined;
  ProductDetail: { productId: string };
  Brand: { brandId: string };
  MatchList: undefined;
  PredictionGame: { matchId: string };
  Store: undefined;
  SignUp: undefined;
  AuthPrompt: undefined;
  CreateProfile: { userId: string; firstName: string; lastName: string; email: string | null };
  FilterScreenResults: FilterOptions & { initialSearchQuery?: string };
  ProductList: { title: string; category?: string; brandId?: string; searchQuery?: string };
  // --- AJOUT ---
  CategorySelection: { onSelectCategory: (category: Segment | undefined) => void };
};

export type MainStackParamList = {
  Tabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Catalog: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// --- Prediction Game ---
export type Prediction = {
  id?: string;
  userId: string;
  userName: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
  createdAt: any;
  isWinner?: boolean;
};

export type Match = {
  id?: string;
  startTime: FirebaseFirestoreTypes.Timestamp;
  finalScoreA?: number | null;
  finalScoreB?: number | null;
  teamA: string;
  teamB: string;
  teamALogo?: string;
  teamBLogo?: string;
  competition: string;
  predictionCount?: number;
  trends?: { [score: string]: number };
};

// --- Boutique Info ---
export type BoutiqueInfo = {
  name: string;
  description: string;
  coverImageUrl: string;
  profileImageUrl: string;
  googleMapsUrl: string;
  whatsappNumber: string;
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  address?: string;
  openingHours?: string;
  category?: string;
};

// --- Carte Promotionnelle (HomeScreen) ---
export type PromoCard = {
  id: string;
  title: string;
  subtitle?: string;
  cta: string;
  image: string;
  screen?: keyof RootStackParamList;
  sortOrder: number;
};