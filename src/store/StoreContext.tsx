import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { FirebaseAuthTypes, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { auth } from '../firebase/config';
import { User } from '../types';

// --- Types & État Initial ---
type State = {
  user: User | null;
};

type Action = { type: 'SET_USER'; user: User | null };

const initialState: State = {
  user: null,
};

// --- Reducer ---
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

// --- Type du Contexte ---
type StoreContextType = {
  user: User | null;
  logout: () => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

// --- Provider ---
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

  const value: StoreContextType = {
    user: state.user,
    logout,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// --- Hook ---
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
