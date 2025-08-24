// src/hooks/usePaginatedProducts.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  FirebaseFirestoreTypes, // Importation principale des types
} from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';

const PAGE_SIZE = 10;

// Options pour la requête
export interface ProductQueryOptions {
  category?: string;
  brandId?: string;
  sortBy?: 'price' | 'name';
  sortDirection?: 'asc' | 'desc';
  searchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  rom?: number;
  ram?: number;
}

// Convertit un document Firestore en type Product
const mapDocToProduct = (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls: imageUrls,
    category: data.brand?.toLowerCase() || 'inconnu',
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
  };
};

// --- NOUVEAU HOOK POUR CHARGER TOUS LES PRODUITS SANS PAGINATION ---
export const useAllProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const buildQuery = useCallback((): FirebaseFirestoreTypes.Query => {
    let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
    const minPriceNum = Number(options.minPrice);
    const maxPriceNum = Number(options.maxPrice);
    const hasPriceFilter = (!isNaN(minPriceNum) && minPriceNum > 0) || (!isNaN(maxPriceNum) && maxPriceNum > 0);
    const hasSearchQuery = !!options.searchQuery;

    if (options.brandId) {
      q = query(q, where('brand', '==', options.brandId));
    } else if (options.category && options.category !== 'Populaires') {
      const categoryCapitalized = options.category.charAt(0).toUpperCase() + options.category.slice(1);
      q = query(q, where('category', '==', categoryCapitalized));
    }

    if (!isNaN(minPriceNum) && minPriceNum > 0) {
      q = query(q, where('price', '>=', minPriceNum));
    }
    if (!isNaN(maxPriceNum) && maxPriceNum > 0) {
      q = query(q, where('price', '<=', maxPriceNum));
    }

    if (options.rom) {
      q = query(q, where('rom', '==', options.rom));
    }
    if (options.ram) {
      q = query(q, where('ram', '==', options.ram));
    }

    if (options.searchQuery) {
      q = query(q, where('name', '>=', options.searchQuery), where('name', '<=', options.searchQuery + '\uf8ff'));
    }

    if (hasSearchQuery) {
      q = query(q, orderBy('name', 'asc'));
    } else if (hasPriceFilter) {
      q = query(q, orderBy('price', options.sortDirection || 'asc'));
    } else if (options.sortBy) {
      q = query(q, orderBy(options.sortBy, options.sortDirection || 'asc'));
    } else {
      q = query(q, orderBy('name', 'asc'));
    }
    return q;
  }, [
    options.category,
    options.brandId,
    options.sortBy,
    options.sortDirection,
    options.searchQuery,
    options.minPrice,
    options.maxPrice,
    options.rom,
    options.ram,
  ]);

  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery();
      const querySnapshot = await getDocs(q);
      const allProducts = querySnapshot.docs.map(mapDocToProduct);
      setProducts(allProducts);
    } catch (error) {
      console.error('Erreur de chargement de tous les produits: ', error);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const refresh = useCallback(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  return { products, loading, refresh };
};

// --- HOOK ORIGINAL POUR LA PAGINATION ---
export const usePaginatedProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  const buildQuery = useCallback((): FirebaseFirestoreTypes.Query => {
    let q: FirebaseFirestoreTypes.Query = collection(db, 'products');

    const minPriceNum = Number(options.minPrice);
    const maxPriceNum = Number(options.maxPrice);
    const hasPriceFilter = (!isNaN(minPriceNum) && minPriceNum > 0) || (!isNaN(maxPriceNum) && maxPriceNum > 0);
    const hasSearchQuery = !!options.searchQuery;

    if (options.brandId) {
      q = query(q, where('brand', '==', options.brandId));
    } else if (options.category && options.category !== 'Populaires') {
      const categoryCapitalized = options.category.charAt(0).toUpperCase() + options.category.slice(1);
      q = query(q, where('category', '==', categoryCapitalized));
    }

    if (!isNaN(minPriceNum) && minPriceNum > 0) {
      q = query(q, where('price', '>=', minPriceNum));
    }
    if (!isNaN(maxPriceNum) && maxPriceNum > 0) {
      q = query(q, where('price', '<=', maxPriceNum));
    }

    if (options.searchQuery) {
      q = query(q, where('name', '>=', options.searchQuery), where('name', '<=', options.searchQuery + '\uf8ff'));
    }

    if (hasSearchQuery) {
      q = query(q, orderBy('name', 'asc'));
    } else if (hasPriceFilter) {
      q = query(q, orderBy('price', options.sortDirection || 'asc'));
    } else if (options.sortBy) {
      q = query(q, orderBy(options.sortBy, options.sortDirection || 'asc'));
    } else {
      q = query(q, orderBy('name', 'asc'));
    }

    return q;
  }, [
    options.category,
    options.brandId,
    options.sortBy,
    options.sortDirection,
    options.searchQuery,
    options.minPrice,
    options.maxPrice,
  ]);

  const fetchProducts = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
      }

      try {
        let q = buildQuery();
        q = query(q, limit(PAGE_SIZE));

        if (!isInitial && lastDocRef.current) {
          q = query(q, startAfter(lastDocRef.current));
        }

        const querySnapshot = await getDocs(q);
        const newProducts = querySnapshot.docs.map(mapDocToProduct);

        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        setHasMore(newProducts.length === PAGE_SIZE);

        if (isInitial) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }
      } catch (error) {
        console.error('Erreur de chargement des produits: ', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery, hasMore, loadingMore]
  );

  const refresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  return { products, loading, loadingMore, hasMore, loadMore: () => fetchProducts(false), refresh };
};
