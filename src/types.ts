// src/types.ts
import { DimensionValue } from 'react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type Category = string;

export type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  category: Category;
  description?: string;
  rom?: number;
  ram?: number;
  ram_base?: number;
  ram_extension?: number;
  ordreVedette?: number; // Ligne ajoutée pour corriger l'erreur
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
  name: string; // Full name: "John Doe"
  firstName?: string;
  lastName?: string;
  email: string | null;
  phoneNumber?: string | null;
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
  id:string;
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
  Main: undefined;
  ProductDetail: { productId: string };
  Brand: { brandId: string };
  MatchList: undefined;
  PredictionGame: { matchId: string };
  Store: undefined;
  SignUp: undefined;
  AuthPrompt: undefined;
  CreateProfile: { userId: string; firstName: string; lastName: string; email: string | null; };
  FilterScreenResults: { 
    initialCategory?: string, 
    initialSearchQuery?: string, 
    minPrice?: string, 
    maxPrice?: string,
    rom?: number;
    ram?: number;
  };
  ProductList: { title: string, category?: string, brandId?: string, searchQuery?: string };
};

// This is for the navigator that wraps the tabs
export type MainStackParamList = {
  Tabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Catalog: { category?: Category, minPrice?: string, maxPrice?: string } | undefined;
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
  createdAt: any; // Firestore ServerTimestamp
  isWinner?: boolean; // Indique si le pronostic est gagnant
};

export type Match = {
  id?: string;
  startTime: FirebaseFirestoreTypes.Timestamp;
  finalScoreA?: number | null;
  finalScoreB?: number | null;
  teamA: string;
  teamB: string;
  teamALogo?: string; // MODIFICATION: Ajout du logo de l'équipe A
  teamBLogo?: string; // MODIFICATION: Ajout du logo de l'équipe B
  competition: string;
  // --- NOUVEAUX CHAMPS POUR L'AGRÉGATION ---
  predictionCount?: number;
  trends?: { [score: string]: number }; // Ex: { "1-0": 50, "2-1": 120 }
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
