import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import { fetchProductsFromDB } from '../data/products';
import { Product, Brand } from '../types';

// --- Logique de récupération des marques ---
export const fetchBrandsFromDB = async (): Promise<Brand[]> => {
  try {
    console.log("Fetching brands from Firestore...");
    const querySnapshot = await firestore().collection('brands').orderBy('sortOrder', 'asc').get();

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

// --- Définition de l'état et du type du contexte ---
type ProductState = {
  products: Product[];
  productsLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
};

const initialState: ProductState = {
  products: [],
  productsLoading: true,
  brands: [],
  brandsLoading: true,
};

type ProductContextType = {
  products: Product[];
  productsLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
  getProductById: (id: string) => Product | undefined;
};

const ProductContext = createContext<ProductContextType | null>(null);

// --- Fournisseur de Contexte (Provider) ---
export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProductState>(initialState);

  useEffect(() => {
    const loadData = async () => {
      const products = await fetchProductsFromDB();
      const brands = await fetchBrandsFromDB();
      setState({
        products,
        brands,
        productsLoading: false,
        brandsLoading: false,
      });
    };
    loadData();
  }, []);

  const getProductById = (id: string) => state.products.find(p => p.id === id);

  const value: ProductContextType = useMemo(() => ({
    ...state,
    getProductById,
  }), [state]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

// --- Hook personnalisé ---
export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductProvider');
  return ctx;
};
