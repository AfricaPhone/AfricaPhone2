// src/store/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Product, Brand } from '../types';

// --- Logique de rÃ©cupÃ©ration des marques ---
export const fetchBrandsFromDB = async (): Promise<Brand[]> => {
  try {
    console.log('Fetching brands from Firestore...');
    const brandsCollection = collection(db, 'brands');
    const q = query(brandsCollection, orderBy('sortOrder', 'asc'));
    const querySnapshot = await getDocs(q);

    const brands: Brand[] = querySnapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        logoUrl: data.logoUrl,
        sortOrder: data.sortOrder,
      };
    });

    console.log('Brands fetched successfully:', brands.length);
    return brands;
  } catch (error) {
    console.error('Error fetching brands: ', error);
    return [];
  }
};

// --- DÃ©finition de l'Ã©tat et du type du contexte ---
type ProductContextType = {
  brands: Brand[];
  brandsLoading: boolean;
  getProductById: (id: string) => Promise<Product | undefined>;
  getProductFromCache: (id: string) => Product | undefined; // Nouvelle fonction synchrone
};

const ProductContext = createContext<ProductContextType | null>(null);

// --- Fournisseur de Contexte (Provider) ---
export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Cache simple en mÃ©moire pour les produits dÃ©jÃ  rÃ©cupÃ©rÃ©s
  const productCache = useState(new Map<string, Product>())[0];

  useEffect(() => {
    const loadInitialData = async () => {
      setBrandsLoading(true);
      const fetchedBrands = await fetchBrandsFromDB();
      setBrands(fetchedBrands);
      setBrandsLoading(false);
    };
    loadInitialData();
  }, []);

  // Fonction pour rÃ©cupÃ©rer un produit par son ID (toujours depuis Firestore pour la fraÃ®cheur)
  const getProductById = useCallback(
    async (id: string): Promise<Product | undefined> => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data) {
            const rawImageUrls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
            const imageUrls = rawImageUrls.length > 0 ? rawImageUrls : data.imageUrl ? [data.imageUrl] : [];
            const price = typeof data.price === 'number' ? data.price : typeof data.price === 'string' ? Number(data.price) : 0;
            const oldPrice = typeof data.oldPrice === 'number' ? data.oldPrice : typeof data.old_price === 'number' ? data.old_price : undefined;
            const product: Product = {
              id: docSnap.id,
              title: data.name,
              price,
              oldPrice,
              image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
              imageUrls,
              gallery: imageUrls,
              category: data.brand?.toLowerCase() || 'inconnu',
              description: data.description,
              rom: data.rom,
              ram: data.ram,
              ram_base: data.ram_base,
              ram_extension: data.ram_extension,
              specifications: data.specifications || [], // MODIFICATION: Ajout des specifications
              enPromotion: data.enPromotion,
              isVedette: data.ordreVedette > 0,
            };
            // Mettre Ã  jour le cache avec les donnÃ©es les plus rÃ©centes
            productCache.set(id, product);
            return product;
          }
        }

        console.warn(`Produit avec ID ${id} non trouvÃ© ou donnÃ©es invalides.`);
        return undefined;
      } catch (error) {
        console.error(`Erreur de rÃ©cupÃ©ration du produit ${id}:`, error);
        return undefined;
      }
    },
    [productCache]
  );

  // Nouvelle fonction pour lire le cache de maniÃ¨re synchrone
  const getProductFromCache = useCallback(
    (id: string): Product | undefined => {
      return productCache.get(id);
    },
    [productCache]
  );

  const value: ProductContextType = useMemo(
    () => ({
      brands,
      brandsLoading,
      getProductById,
      getProductFromCache,
    }),
    [brands, brandsLoading, getProductById, getProductFromCache]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

// --- Hook personnalisÃ© ---
export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductProvider');
  return ctx;
};
