import React, { createContext, useContext, useMemo, useReducer, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FavoritesState, FavoriteCollection, User } from '../types';
import { useProducts } from './ProductContext'; // Importer le nouveau hook

type CartState = Record<string, number>; // productId -> qty

const DEFAULT_COLLECTION_ID = 'default';

type State = {
  cart: CartState;
  favorites: FavoritesState;
  user: User | null;
};

type Action =
  | { type: 'ADD_TO_CART'; productId: string; qty?: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_FAVORITE'; productId: string; collectionId?: string }
  | { type: 'CREATE_COLLECTION'; name: string }
  | { type: 'SET_USER'; user: User | null };

const initialState: State = {
  cart: {},
  favorites: {
    [DEFAULT_COLLECTION_ID]: {
      id: DEFAULT_COLLECTION_ID,
      name: 'Mes Favoris',
      productIds: new Set(),
    },
  },
  user: null, // Initialement déconnecté
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
    case 'SET_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

type StoreContextType = {
  state: State;
  user: User | null;
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
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { getProductById, products } = useProducts(); // Utiliser le nouveau hook

  useEffect(() => {
    // Écouteur d'état d'authentification Firebase
    const subscriber = auth().onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        // L'utilisateur est connecté
        const formattedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.phoneNumber || 'Utilisateur',
          email: firebaseUser.email || '',
          initials: firebaseUser.displayName ? firebaseUser.displayName.charAt(0) : 'U',
        };
        dispatch({ type: 'SET_USER', user: formattedUser });
      } else {
        // L'utilisateur est déconnecté
        dispatch({ type: 'SET_USER', user: null });
      }
    });
    return subscriber; // Se désabonner lors du démontage
  }, []);

  const logout = () => auth().signOut();
  const addToCart = (productId: string, qty?: number) => dispatch({ type: 'ADD_TO_CART', productId, qty });
  const removeFromCart = (productId: string) => dispatch({ type: 'REMOVE_FROM_CART', productId });
  const setQty = (productId: string, qty: number) => dispatch({ type: 'SET_QTY', productId, qty });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const toggleFavorite = (productId: string, collectionId?: string) => dispatch({ type: 'TOGGLE_FAVORITE', productId, collectionId });
  const createCollection = (name: string) => dispatch({ type: 'CREATE_COLLECTION', name });

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
  }, [state.cart, state.favorites, products, getProductById]); // `products` et `getProductById` sont maintenant des dépendances

  const value: StoreContextType = {
    state,
    user: state.user,
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
