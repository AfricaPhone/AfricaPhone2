import React, { createContext, useContext, useMemo, useReducer, useEffect } from 'react';
import { FirebaseAuthTypes, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { auth } from '../firebase/config';
import { FavoritesState, FavoriteCollection, User } from '../types';

const DEFAULT_COLLECTION_ID = 'default';

type State = {
  favorites: FavoritesState;
  user: User | null;
};

type Action =
  | { type: 'TOGGLE_FAVORITE'; productId: string; collectionId?: string }
  | { type: 'CREATE_COLLECTION'; name: string }
  | { type: 'SET_USER'; user: User | null };

const initialState: State = {
  favorites: {
    [DEFAULT_COLLECTION_ID]: {
      id: DEFAULT_COLLECTION_ID,
      name: 'Mes Favoris',
      productIds: new Set(),
    },
  },
  user: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
  user: User | null;
  logout: () => void;
  toggleFavorite: (productId: string, collectionId?: string) => void;
  createCollection: (name: string) => void;
  isFav: (id: string) => boolean;
  collections: FavoriteCollection[];
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        const formattedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.phoneNumber || 'Utilisateur',
          email: firebaseUser.email || '',
          initials: firebaseUser.displayName ? firebaseUser.displayName.charAt(0) : 'U',
        };
        dispatch({ type: 'SET_USER', user: formattedUser });
      } else {
        dispatch({ type: 'SET_USER', user: null });
      }
    });
    return subscriber;
  }, []);

  const logout = () => signOut(auth);
  const toggleFavorite = (productId: string, collectionId?: string) => dispatch({ type: 'TOGGLE_FAVORITE', productId, collectionId });
  const createCollection = (name: string) => dispatch({ type: 'CREATE_COLLECTION', name });

  const derived = useMemo(() => {
    const allFavProductIds = new Set<string>();
    Object.values(state.favorites).forEach(collection => {
      collection.productIds.forEach(id => allFavProductIds.add(id));
    });
    const isFav = (id: string) => allFavProductIds.has(id);
    
    const collections = Object.values(state.favorites);

    return { isFav, collections };
  }, [state.favorites]);

  const value: StoreContextType = {
    user: state.user,
    logout,
    toggleFavorite,
    createCollection,
    isFav: derived.isFav,
    collections: derived.collections,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
