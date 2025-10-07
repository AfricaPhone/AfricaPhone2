// src/types.ts
import { DimensionValue } from 'react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// AJOUT: La définition de Segment est maintenant ici et est exportée
export const SEGMENTS = ['Populaires', 'tablette', 'portable a touche', 'accessoire'] as const;
export type Segment = (typeof SEGMENTS)[number];

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
  participatedContests?: UserContest[];
  hasSharedApp?: boolean;
  appShareCount?: number;
  lastAppShareAt?: string;
  isAdmin?: boolean;
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
  category?: Segment;
  brands?: Brand[];
  minPrice?: string;
  maxPrice?: string;
  enPromotion?: boolean;
  isVedette?: boolean;
  rom?: number;
  ram?: number;
  selectedPriceRangeKey?: string;
};

export type RootStackParamList = {
  Main: undefined;
  ProductDetail: { productId: string };
  Brand: { brandId: string };
  MatchList: undefined;
  PredictionGame: { matchId: string };
  PredictionRules: undefined;
  Store: undefined;
  SignUp: undefined;
  AuthPrompt: undefined;
  CreateProfile: { userId: string; firstName: string; lastName: string; email: string | null };
  FilterScreenResults: FilterOptions;
  FilterScreen: undefined;
  ProductList: { title: string; category?: string; brandId?: string; searchQuery?: string };
  CategorySelection: undefined;
  Contest: { contestId: string };
  CandidateProfile: { candidate: Candidate };
  AdminWinners: undefined;
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
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt?: FirebaseFirestoreTypes.Timestamp;
  isWinner?: boolean;
  featuredWinner?: boolean;
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
  screenParams?: object;
  sortOrder: number;
};

// --- Concours de Vote ---
export type Contest = {
  id: string;
  title: string;
  description: string;
  endDate: Date;
  status: 'active' | 'ended';
  totalParticipants: number;
  totalVotes: number;
};

export type Candidate = {
  id: string;
  contestId: string;
  name: string;
  media: string;
  photoUrl: string;
  voteCount: number;
};

export type UserContest = {
  contestId: string;
  contestName: string;
  badgeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
};

