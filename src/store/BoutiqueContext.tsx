// src/store/BoutiqueContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { BoutiqueInfo } from '../types';

// --- Définition du type du contexte ---
type BoutiqueContextType = {
  boutiqueInfo: BoutiqueInfo | null;
  loading: boolean;
};

const BoutiqueContext = createContext<BoutiqueContextType | null>(null);

// --- Fournisseur de Contexte (Provider) ---
export const BoutiqueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boutiqueInfo, setBoutiqueInfo] = useState<BoutiqueInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoutiqueInfo = async () => {
      try {
        const docRef = doc(db, 'config', 'boutiqueInfo');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists) {
          setBoutiqueInfo(docSnap.data() as BoutiqueInfo);
        } else {
          console.warn('Document boutiqueInfo non trouvé dans Firestore !');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des infos de la boutique:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueInfo();
  }, []);

  const value = useMemo(
    () => ({
      boutiqueInfo,
      loading,
    }),
    [boutiqueInfo, loading]
  );

  return <BoutiqueContext.Provider value={value}>{children}</BoutiqueContext.Provider>;
};

// --- Hook personnalisé ---
export const useBoutique = () => {
  const ctx = useContext(BoutiqueContext);
  if (!ctx) throw new Error('useBoutique must be used within a BoutiqueProvider');
  return ctx;
};
