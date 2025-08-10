import React, { createContext, useContext, useMemo, useReducer, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { fetchProductsFromDB } from '../data/products';
import { FavoritesState, FavoriteCollection, User, Product, Brand } from '../types';

type CartState = Record<string, number>; // productId -> qty

const DEFAULT_COLLECTION_ID = 'default';

// A mock user for demonstration
const MOCK_USER: User = {
  id: 'user_123',
  name: 'Marie',
  email: 'marie@ecommerce.com',
  initials: 'M',
};

type State = {
  cart: CartState;
  favorites: FavoritesState;
  user: User | null;
  products: Product[];
  productsLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
};

type Action =
  | { type: 'ADD_TO_CART'; productId: string; qty?: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_FAVORITE'; productId: string; collectionId?: string }
  | { type: 'CREATE_COLLECTION'; name: string }
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'SET_BRANDS'; brands: Brand[] };

const initialState: State = {
  cart: {},
  favorites: {
    [DEFAULT_COLLECTION_ID]: {
      id: DEFAULT_COLLECTION_ID,
      name: 'Mes Favoris',
      productIds: new Set(),
    },
  },
  user: null, // Initially logged out
  products: [],
  productsLoading: true,
  brands: [],
  brandsLoading: true,
};

// --- Brand Fetching ---
export const fetchBrandsFromDB = async (): Promise<Brand[]> => {
  try {
    console.log("Fetching brands from Firestore...");
    const brandsCollection = collection(db, 'brands');
    const q = query(brandsCollection, orderBy('sortOrder', 'asc'));
    const querySnapshot = await getDocs(q);

    const brands: Brand[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        logoUrl: data.logoUrl,
        sortOrder: data.sortOrder,
      };
    });

    console.log("Brands fetched successfully:", brands.length);
    return brands;
  } catch (error) {
    console.error("Error fetching brands: ", error);
    return [];
  }
};


function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const qty = action.qty ?? 1;
      const current = state.cart[action.productId] ?? 0;
      return { ...state, cart: { ...state.cart, [action.productId]: current + qty } };
    }
    case 'REMOVE_FROM_CART': {
      const next = { ...state.cart };
      delete next[action.productId];
      return { ...state, cart: next };
    }
    case 'SET_QTY': {
      const next = { ...state.cart };
      if (action.qty <= 0) delete next[action.productId];
      else next[action.productId] = action.qty;
      return { ...state, cart: next };
    }
    case 'CLEAR_CART':
      return { ...state, cart: {} };
    case 'TOGGLE_FAVORITE': {
      const collectionId = action.collectionId ?? DEFAULT_COLLECTION_ID;
      const collection = state.favorites[collectionId];
      if (!collection) return state;

      const newProductIds = new Set(collection.productIds);
      if (newProductIds.has(action.productId)) {
        newProductIds.delete(action.productId);
      } else {
        newProductIds.add(action.productId);
      }

      return {
        ...state,
        favorites: {
          ...state.favorites,
          [collectionId]: { ...collection, productIds: newProductIds },
        },
      };
    }
    case 'CREATE_COLLECTION': {
      const newId = `collection_${Date.now()}`;
      const newCollection: FavoriteCollection = {
        id: newId,
        name: action.name,
        productIds: new Set(),
      };
      return {
        ...state,
        favorites: {
          ...state.favorites,
          [newId]: newCollection,
        },
      };
    }
    case 'LOGIN':
      return { ...state, user: MOCK_USER };
    case 'LOGOUT':
      return { ...state, user: null };
    case 'SET_PRODUCTS':
      return { ...state, products: action.products, productsLoading: false };
    case 'SET_BRANDS':
      return { ...state, brands: action.brands, brandsLoading: false };
    default:
      return state;
  }
}

type StoreContextType = {
  state: State;
  user: User | null;
  login: () => void;
  logout: () => void;
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string, collectionId?: string) => void;
  createCollection: (name: string) => void;
  isFav: (id: string) => boolean;
  collections: FavoriteCollection[];
  cartCount: number;
  total: number;
  cartItems: Array<{ productId: string; qty: number; title: string; price: number; image: string }>;
  products: Product[];
  productsLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
  getProductById: (id: string) => Product | undefined;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loadData = async () => {
      const products = await fetchProductsFromDB();
      dispatch({ type: 'SET_PRODUCTS', products });

      const brands = await fetchBrandsFromDB();
      dispatch({ type: 'SET_BRANDS', brands });
    };
    loadData();
  }, []);

  const login = () => dispatch({ type: 'LOGIN' });
  const logout = () => dispatch({ type: 'LOGOUT' });
  const addToCart = (productId: string, qty?: number) => dispatch({ type: 'ADD_TO_CART', productId, qty });
  const removeFromCart = (productId: string) => dispatch({ type: 'REMOVE_FROM_CART', productId });
  const setQty = (productId: string, qty: number) => dispatch({ type: 'SET_QTY', productId, qty });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const toggleFavorite = (productId: string, collectionId?: string) => dispatch({ type: 'TOGGLE_FAVORITE', productId, collectionId });
  const createCollection = (name: string) => dispatch({ type: 'CREATE_COLLECTION', name });

  const getProductById = (id: string) => state.products.find(p => p.id === id);

  const derived = useMemo(() => {
    const cartEntries = Object.entries(state.cart);
    const cartItems = cartEntries
      .map(([productId, qty]) => {
        const p = getProductById(productId);
        if (!p) return null;
        return { productId, qty, title: p.title, price: p.price, image: p.image };
      })
      .filter(Boolean) as Array<{ productId: string; qty: number; title: string; price: number; image: string }>;

    const cartCount = cartEntries.reduce((sum, [, q]) => sum + q, 0);
    const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    
    const allFavProductIds = new Set<string>();
    Object.values(state.favorites).forEach(collection => {
      collection.productIds.forEach(id => allFavProductIds.add(id));
    });
    const isFav = (id: string) => allFavProductIds.has(id);
    
    const collections = Object.values(state.favorites);

    return { cartItems, cartCount, total, isFav, collections };
  }, [state.cart, state.favorites, state.products]);

  const value: StoreContextType = {
    state,
    user: state.user,
    login,
    logout,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    toggleFavorite,
    createCollection,
    isFav: derived.isFav,
    collections: derived.collections,
    cartCount: derived.cartCount,
    total: derived.total,
    cartItems: derived.cartItems,
    products: state.products,
    productsLoading: state.productsLoading,
    brands: state.brands,
    brandsLoading: state.brandsLoading,
    getProductById,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
