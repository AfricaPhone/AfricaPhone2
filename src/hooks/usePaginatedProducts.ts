import { useState, useCallback, useRef, useEffect } from 'react';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
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

type Query = FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData>;
type QuerySnapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const mapDocToProduct = (doc: QuerySnapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls,
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

const buildBaseQuery = (): Query => db.collection('products');

export const useAllProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const buildQuery = useCallback((): Query => {
    let q: Query = buildBaseQuery();
    const minPriceNum = Number(options.minPrice);
    const maxPriceNum = Number(options.maxPrice);
    const hasMinPrice = !Number.isNaN(minPriceNum) && minPriceNum > 0;
    const hasMaxPrice = !Number.isNaN(maxPriceNum) && maxPriceNum > 0;
    const hasPriceFilter = hasMinPrice || hasMaxPrice;

    if (options.brandId) {
      q = q.where('brand', '==', options.brandId);
    } else if (options.category && options.category !== 'Populaires') {
      q = q.where('category', '==', options.category);
    }

    if (options.enPromotion) {
      q = q.where('enPromotion', '==', true);
    }

    if (options.isVedette) {
      q = q.where('ordreVedette', '>', 0);
    }

    if (hasMinPrice) {
      q = q.where('price', '>=', minPriceNum);
    }

    if (hasMaxPrice) {
      q = q.where('price', '<=', maxPriceNum);
    }

    if (options.rom) {
      q = q.where('rom', '==', options.rom);
    }

    if (options.ram) {
      q = q.where('ram', '==', options.ram);
    }

    if (options.searchQuery) {
      const start = options.searchQuery;
      const end =
        start.slice(0, -1) + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);

      q = q.orderBy('name').startAt(start).endAt(end);
    } else if (hasPriceFilter) {
      q = q.orderBy('price', options.sortDirection || 'asc');
    } else {
      const sortByField = options.sortBy || 'name';
      const sortDirection = options.sortDirection || 'asc';
      q = q.orderBy(sortByField, sortDirection);
    }

    return q;
  }, [
    options.brandId,
    options.category,
    options.enPromotion,
    options.isVedette,
    options.maxPrice,
    options.minPrice,
    options.ram,
    options.rom,
    options.searchQuery,
    options.sortBy,
    options.sortDirection,
  ]);

  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery();
      const querySnapshot = await q.get();
      const allProducts = querySnapshot.docs.map(mapDocToProduct);
      setProducts(allProducts);
    } catch (error) {
      console.error('Erreur de chargement de tous les produits: ', error);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  const refresh = useCallback(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  return { products, loading, refresh };
};

export const usePaginatedProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef<QuerySnapshot | null>(null);

  const buildQuery = useCallback((): Query => {
    let q: Query = buildBaseQuery();

    if (options.brandId) {
      q = q.where('brand', '==', options.brandId);
    } else if (options.category && options.category !== 'Populaires') {
      q = q.where('category', '==', options.category);
    }

    const sortByField = options.sortBy || 'name';
    const sortDirection = options.sortDirection || 'asc';
    q = q.orderBy(sortByField, sortDirection);

    return q;
  }, [options.brandId, options.category, options.sortBy, options.sortDirection]);

  const fetchProducts = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        if (loadingMore || !hasMore) {
          return;
        }
        setLoadingMore(true);
      }

      try {
        let q = buildQuery().limit(PAGE_SIZE);

        if (!isInitial && lastDocRef.current) {
          q = q.startAfter(lastDocRef.current);
        }

        const querySnapshot = await q.get();
        const newProducts = querySnapshot.docs.map(mapDocToProduct);

        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
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

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore: () => fetchProducts(false),
    refresh,
  };
};
