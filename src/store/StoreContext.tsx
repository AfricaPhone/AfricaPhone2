import React, { createContext, useState, useEffect, ReactNode } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import firestore from "@react-native-firebase/firestore";
import { User } from "../types";

interface StoreContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isStoreLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profileData: Partial<User>) => Promise<void>;
}

export const StoreContext = createContext<StoreContextProps>({
  user: null,
  isAuthenticated: false,
  isStoreLoading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
});

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isStoreLoading, setStoreLoading] = useState(true);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  const onAuthStateChanged = async (
    firebaseUser: FirebaseAuthTypes.User | null
  ) => {
    if (firebaseUser) {
      const userDoc = await firestore()
        .collection("users")
        .doc(firebaseUser.uid)
        .get();

      if (userDoc.exists) {
        setUser(userDoc.data() as User);
      } else {
        // If user document doesn't exist, create a basic one
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          createdAt: new Date(),
          isProfileCompleted: false,
        };
        await firestore()
          .collection("users")
          .doc(firebaseUser.uid)
          .set(newUser);
        setUser(newUser);
      }
    } else {
      setUser(null);
    }
    setStoreLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      setStoreLoading(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
    } catch (error) {
      console.error(error);
      setStoreLoading(false);
    }
  };

  const logout = async () => {
    try {
      setStoreLoading(true);
      await auth().signOut();
      await GoogleSignin.signOut();
      setUser(null);
    } catch (error) {
      console.error(error);
    } finally {
      setStoreLoading(false);
    }
  };

  const updateUserProfile = async (profileData: Partial<User>) => {
    if (user) {
      try {
        setStoreLoading(true);
        const userRef = firestore().collection("users").doc(user.uid);
        await userRef.update(profileData);
        const updatedUserDoc = await userRef.get();
        setUser(updatedUserDoc.data() as User);
      } catch (error) {
        console.error("Error updating user profile:", error);
      } finally {
        setStoreLoading(false);
      }
    }
  };

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