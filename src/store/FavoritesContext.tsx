import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { FavoritesState, FavoriteCollection } from '../types';

// --- Types & État Initial ---
const DEFAULT_COLLECTION_ID = 'default';

const initialState: FavoritesState = {
  [DEFAULT_COLLECTION_ID]: {
    id: DEFAULT_COLLECTION_ID,
    name: 'Mes Favoris',
    productIds: new Set(),
  },
};

type Action =
  | { type: 'TOGGLE_FAVORITE'; productId: string; collectionId?: string }
  | { type: 'CREATE_COLLECTION'; name: string };

// --- Reducer ---
function reducer(state: FavoritesState, action: Action): FavoritesState {
  switch (action.type) {
    case 'TOGGLE_FAVORITE': {
      const collectionId = action.collectionId ?? DEFAULT_COLLECTION_ID;
      const collection = state[collectionId];
      if (!collection) return state;

      const newProductIds = new Set(collection.productIds);
      if (newProductIds.has(action.productId)) {
        newProductIds.delete(action.productId);
      } else {
        newProductIds.add(action.productId);
      }

      return {
        ...state,
        [collectionId]: { ...collection, productIds: newProductIds },
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
        [newId]: newCollection,
      };
    }
    default:
      return state;
  }
}

// --- Type du Contexte ---
type FavoritesContextType = {
  toggleFavorite: (productId: string, collectionId?: string) => void;
  createCollection: (name: string) => void;
  isFav: (id: string) => boolean;
  collections: FavoriteCollection[];
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

// --- Provider ---
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, dispatch] = useReducer(reducer, initialState);

  const toggleFavorite = (productId: string, collectionId?: string) => dispatch({ type: 'TOGGLE_FAVORITE', productId, collectionId });
  const createCollection = (name: string) => dispatch({ type: 'CREATE_COLLECTION', name });

  const derived = useMemo(() => {
    const allFavProductIds = new Set<string>();
    Object.values(favorites).forEach(collection => {
      collection.productIds.forEach(id => allFavProductIds.add(id));
    });
    const isFav = (id: string) => allFavProductIds.has(id);
    
    const collections = Object.values(favorites);

    return { isFav, collections };
  }, [favorites]);

  const value: FavoritesContextType = {
    toggleFavorite,
    createCollection,
    ...derived,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

// --- Hook ---
export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
