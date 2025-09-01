// src/store/StoreContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { FirebaseAuthTypes, onAuthStateChanged, signOut } from '@react-native-firebase/auth'; // CORRIGÉ
import { doc, getDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../types';
import { registerForPushNotificationsAsync, saveTokenToFirestore } from '../services/notificationService';

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
  // NOUVELLE FONCTION POUR RAFRAÎCHIR LE JETON
  getFreshToken: () => Promise<string | null>;
};

const StoreContext = createContext<StoreContextType | null>(null);

// --- Provider ---
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // CORRIGÉ : Syntaxe modulaire
    const subscriber = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as { firstName: string; lastName: string };
            const fullName = `${userData.firstName} ${userData.lastName}`;
            const formattedUser: User = {
              id: firebaseUser.uid,
              name: fullName,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: firebaseUser.email,
              phoneNumber: firebaseUser.phoneNumber,
              initials: userData.firstName ? userData.firstName.charAt(0).toUpperCase() : 'U',
            };
            dispatch({ type: 'SET_USER', user: formattedUser });
          } else {
            // Fallback for users that might exist in Auth but not in Firestore
            const fallbackUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.phoneNumber || 'Utilisateur',
              email: firebaseUser.email,
              phoneNumber: firebaseUser.phoneNumber,
              initials: firebaseUser.displayName ? firebaseUser.displayName.charAt(0) : 'U',
            };
            dispatch({ type: 'SET_USER', user: fallbackUser });
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil utilisateur:', error);
          dispatch({ type: 'SET_USER', user: null });
        }
      } else {
        dispatch({ type: 'SET_USER', user: null });
      }
    });
    return subscriber;
  }, []);

  // AJOUTÉ : Nouvel effet pour gérer l'enregistrement des notifications
  useEffect(() => {
    const setupNotifications = async () => {
      if (state.user) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await saveTokenToFirestore(state.user.id, token);
        }
      }
    };

    setupNotifications();
  }, [state.user]);


  const logout = () => signOut(auth); // CORRIGÉ

  /**
   * Force le rafraîchissement du jeton d'identification de l'utilisateur.
   * @returns Le nouveau jeton ou null si l'utilisateur n'est pas connecté.
   */
  const getFreshToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser; // CORRIGÉ
    if (currentUser) {
      try {
        // Le paramètre `true` force le rafraîchissement du jeton.
        const token = await currentUser.getIdToken(true);
        return token;
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du jeton:', error);
        return null;
      }
    }
    return null;
  };

  const value: StoreContextType = {
    user: state.user,
    logout,
    getFreshToken, // Exposer la nouvelle fonction
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// --- Hook ---
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};