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
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  startAt,
  endAt,
} from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';

const PAGE_SIZE = 10;

export interface ProductQueryOptions {
  category?: string;
  brandId?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
  searchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  rom?: number;
  ram?: number;
  enPromotion?: boolean;
  isVedette?: boolean;
}

const mapDocToProduct = (doc: QueryDocumentSnapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls: imageUrls,
    category: (data.brand || 'inconnu').toLowerCase(),
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
    specifications: data.specifications || [],
    enPromotion: data.enPromotion,
    isVedette: data.ordreVedette > 0,
  };
};

export const useAllProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const buildQuery = useCallback((): Query<DocumentData> => {
    let q: Query<DocumentData> = collection(db, 'products');
    const minPriceNum = Number(options.minPrice);
    const maxPriceNum = Number(options.maxPrice);
    const hasPriceFilter = !isNaN(minPriceNum) && minPriceNum > 0 || !isNaN(maxPriceNum) && maxPriceNum > 0;

    if (options.brandId) {
      q = query(q, where('brand', '==', options.brandId));
    } else if (options.category && options.category !== 'Populaires') {
      q = query(q, where('category', '==', options.category));
    }
    if (options.enPromotion) {
      q = query(q, where('enPromotion', '==', true));
    }
    if (options.isVedette) {
      q = query(q, where('ordreVedette', '>', 0));
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

    // CORRECTION: Logique de tri ajustée pour Firestore
    if (options.searchQuery) {
        const searchQueryEnd = options.searchQuery.slice(0, -1) + String.fromCharCode(options.searchQuery.charCodeAt(options.searchQuery.length - 1) + 1);
        q = query(q, orderBy('name'), startAt(options.searchQuery), endAt(searchQueryEnd));
    } else if (hasPriceFilter) {
        // Si on filtre par prix, on doit d'abord trier par prix
        q = query(q, orderBy('price', options.sortDirection || 'asc'));
    } else {
        const sortByField = options.sortBy || 'name';
        const sortDirection = options.sortDirection || 'asc';
        q = query(q, orderBy(sortByField, sortDirection));
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
    options.enPromotion,
    options.isVedette,
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

export const usePaginatedProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  const buildQuery = useCallback((): Query<DocumentData> => {
    let q: Query<DocumentData> = collection(db, 'products');

    if (options.brandId) {
      q = query(q, where('brand', '==', options.brandId));
    } else if (options.category && options.category !== 'Populaires') {
      q = query(q, where('category', '==', options.category));
    }
    
    q = query(q, orderBy(options.sortBy || 'name', options.sortDirection || 'asc'));

    return q;
  }, [
    options.category,
    options.brandId,
    options.sortBy,
    options.sortDirection,
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