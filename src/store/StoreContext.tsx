import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import firestore from '@react-native-firebase/firestore';
import { User } from '../types';

interface StoreContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isStoreLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profileData: Partial<User>) => Promise<void>;
}

type FirestoreUser = Partial<User> & {
  uid?: string;
  displayName?: string | null;
};

const getNameFromEmail = (email?: string | null) => {
  if (!email) {
    return undefined;
  }

  const [name] = email.split('@');
  return name?.trim() || undefined;
};

const computeInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '??';
  }

  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length === 0) {
    return '??';
  }

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  const first = segments[0][0] ?? '';
  const last = segments[segments.length - 1][0] ?? '';
  const initials = `${first}${last}`.toUpperCase();

  return initials || '??';
};

const createUserFromAuthUser = (firebaseUser: FirebaseAuthTypes.User): User => {
  const email = firebaseUser.email ?? null;
  const fallbackName = firebaseUser.displayName?.trim() || getNameFromEmail(email) || 'Utilisateur';

  return {
    id: firebaseUser.uid,
    name: fallbackName,
    email,
    phoneNumber: firebaseUser.phoneNumber ?? null,
    initials: computeInitials(fallbackName),
  };
};

const normalizeUser = (
  firestoreUser: FirestoreUser,
  options: {
    authUser?: FirebaseAuthTypes.User | null;
    currentUser?: User | null;
  } = {}
): User => {
  const { authUser, currentUser } = options;
  const { uid, displayName, ...rest } = firestoreUser;

  const email = rest.email ?? currentUser?.email ?? authUser?.email ?? null;

  const emailName = getNameFromEmail(typeof email === 'string' ? email : undefined);

  const nameFromParts = [rest.firstName ?? currentUser?.firstName, rest.lastName ?? currentUser?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const resolvedName =
    rest.name ??
    (nameFromParts ? nameFromParts : undefined) ??
    currentUser?.name ??
    displayName ??
    authUser?.displayName ??
    emailName ??
    'Utilisateur';

  const initialsSource = resolvedName || emailName || 'Utilisateur';

  const hasExplicitInitials = rest.initials !== undefined && rest.initials !== currentUser?.initials;
  const nameChanged = resolvedName !== (currentUser?.name ?? '');
  const firstNameChanged = (rest.firstName ?? currentUser?.firstName) !== currentUser?.firstName;
  const lastNameChanged = (rest.lastName ?? currentUser?.lastName) !== currentUser?.lastName;

  const shouldRecomputeInitials = !hasExplicitInitials && (nameChanged || firstNameChanged || lastNameChanged);

  const resolvedInitials = shouldRecomputeInitials
    ? computeInitials(initialsSource)
    : (rest.initials ?? currentUser?.initials ?? computeInitials(initialsSource));

  const resolvedId = rest.id ?? currentUser?.id ?? uid ?? authUser?.uid ?? '';

  if (!resolvedId) {
    console.warn('StoreContext: unable to determine user identifier.');
  }

  return {
    id: resolvedId || '',
    name: resolvedName,
    email,
    phoneNumber: rest.phoneNumber ?? currentUser?.phoneNumber ?? authUser?.phoneNumber ?? undefined,
    initials: resolvedInitials,
    firstName: rest.firstName ?? currentUser?.firstName,
    lastName: rest.lastName ?? currentUser?.lastName,
    pushTokens: rest.pushTokens ?? currentUser?.pushTokens,
    participatedContests: rest.participatedContests ?? currentUser?.participatedContests,
  };
};

export const StoreContext = createContext<StoreContextProps | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isStoreLoading, setStoreLoading] = useState(true);

  const handleAuthStateChange = useCallback(async (firebaseUser: FirebaseAuthTypes.User | null) => {
    setStoreLoading(true);
    try {
      if (firebaseUser) {
        const userDocRef = firestore().collection('users').doc(firebaseUser.uid);
        const snapshot = await userDocRef.get();

        if (snapshot.exists()) {
          const data = snapshot.data() as FirestoreUser;
          setUser(normalizeUser(data, { authUser: firebaseUser }));
        } else {
          const newUser = createUserFromAuthUser(firebaseUser);
          await userDocRef.set(newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      if (firebaseUser) {
        setUser(createUserFromAuthUser(firebaseUser));
      } else {
        setUser(null);
      }
    } finally {
      setStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(handleAuthStateChange);
    return subscriber;
  }, [handleAuthStateChange]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setStoreLoading(true);
      await GoogleSignin.hasPlayServices();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setStoreLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setStoreLoading(true);
      await auth().signOut();
      await GoogleSignin.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(
    async (profileData: Partial<User>) => {
      if (!user) {
        return;
      }

      setStoreLoading(true);
      try {
        const authUser = auth().currentUser;
        const userId = user.id || authUser?.uid;
        if (!userId) {
          console.warn('StoreContext: Unable to determine user document id during profile update.');
          return;
        }

        const sanitizedProfileData = Object.fromEntries(
          Object.entries(profileData).filter(([, value]) => value !== undefined)
        ) as Partial<User>;

        const userRef = firestore().collection('users').doc(userId);
        await userRef.set(sanitizedProfileData, { merge: true });

        setUser(prev => {
          if (!prev) {
            return prev;
          }
          const mergedData: FirestoreUser = { ...prev, ...sanitizedProfileData };
          return normalizeUser(mergedData, {
            currentUser: prev,
            authUser,
          });
        });
      } catch (error) {
        console.error('Error updating user profile:', error);
      } finally {
        setStoreLoading(false);
      }
    },
    [user]
  );

  return (
    <StoreContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isStoreLoading,
        signInWithGoogle,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextProps => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }

  return context;
};
