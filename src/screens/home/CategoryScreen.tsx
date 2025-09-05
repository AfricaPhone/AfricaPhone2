// src/screens/home/CategoryScreen.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { usePaginatedProducts } from '../../hooks/usePaginatedProducts';
import ProductGrid from './ProductGrid';
import HomeListHeader from './HomeListHeader';
import { useProducts } from '../../store/ProductContext';
import { Product, PromoCard } from '../../types';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { db } from '../../firebase/config';

const PAGE_SIZE = 10;

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
    ordreVedette: data.ordreVedette,
  };
};

const CategoryScreen = ({ route }: any) => {
  const { category } = route.params;

  // States for 'Populaires' tab
  const [vedetteProducts, setVedetteProducts] = useState<Product[]>([]);
  const [regularProducts, setRegularProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const [hasMoreRegular, setHasMoreRegular] = useState(true);

  // States for other tabs (using the hook)
  const {
    products: categoryProducts,
    loading: categoryLoading,
    loadingMore: categoryLoadingMore,
    hasMore: hasMoreCategory,
    loadMore: loadMoreCategory,
    refresh: refreshCategory,
  } = usePaginatedProducts({
    category: category !== 'Populaires' ? category : undefined,
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // States for header
  const { brands, brandsLoading } = useProducts();
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [promoCardsLoading, setPromoCardsLoading] = useState(true);

  const fetchPopulars = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Fetch vedette products (non-paginated)
      const vedetteQuery = query(
        collection(db, 'products'),
        where('ordreVedette', '>=', 1),
        where('ordreVedette', '<=', 6),
        orderBy('ordreVedette', 'asc')
      );
      const vedetteSnapshot = await getDocs(vedetteQuery);
      const fetchedVedette = vedetteSnapshot.docs.map(mapDocToProduct);
      setVedetteProducts(fetchedVedette);

      // Fetch first page of regular products
      const regularQuery = query(
        collection(db, 'products'),
        where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
        orderBy('ordreVedette', 'asc'),
        orderBy('name', 'asc'),
        limit(PAGE_SIZE)
      );
      const regularSnapshot = await getDocs(regularQuery);
      const fetchedRegular = regularSnapshot.docs.map(mapDocToProduct);
      setRegularProducts(fetchedRegular);
      setLastDoc(regularSnapshot.docs[regularSnapshot.docs.length - 1] || null);
      setHasMoreRegular(fetchedRegular.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching popular products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMorePopulars = useCallback(async () => {
    if (loadingMore || !hasMoreRegular || !lastDoc) return;
    setLoadingMore(true);

    try {
      const regularQuery = query(
        collection(db, 'products'),
        where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
        orderBy('ordreVedette', 'asc'),
        orderBy('name', 'asc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const regularSnapshot = await getDocs(regularQuery);
      const newProducts = regularSnapshot.docs.map(mapDocToProduct);
      setRegularProducts(prev => [...prev, ...newProducts]);
      setLastDoc(regularSnapshot.docs[regularSnapshot.docs.length - 1] || null);
      setHasMoreRegular(newProducts.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more popular products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMoreRegular]);

  useEffect(() => {
    if (category === 'Populaires') {
      fetchPopulars();
      // Also fetch promo cards for the header
      const fetchPromoCards = async () => {
        try {
          setPromoCardsLoading(true);
          const promoCardsQuery = query(
            collection(db, 'promoCards'),
            where('isActive', '==', true),
            orderBy('sortOrder', 'asc')
          );
          const querySnapshot = await getDocs(promoCardsQuery);
          const fetchedCards = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as PromoCard[];
          setPromoCards(fetchedCards);
        } catch (error) {
          console.error('Erreur de chargement des cartes promo :', error);
        } finally {
          setPromoCardsLoading(false);
        }
      };
      fetchPromoCards();
    } else {
      refreshCategory();
    }
  }, [category, fetchPopulars, refreshCategory]);

  const onRefresh = useCallback(() => {
    if (category === 'Populaires') {
      fetchPopulars(true);
    } else {
      refreshCategory();
    }
  }, [category, fetchPopulars, refreshCategory]);

  const memoizedListHeader = useMemo(() => {
    if (category !== 'Populaires') {
      return null;
    }
    return (
      <HomeListHeader
        brands={brands}
        brandsLoading={brandsLoading}
        promoCards={promoCards}
        promoCardsLoading={promoCardsLoading}
      />
    );
  }, [brands, brandsLoading, promoCards, promoCardsLoading, category]);

  if (category === 'Populaires') {
    return (
      <ProductGrid
        products={[...vedetteProducts, ...regularProducts]}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMorePopulars}
        onRefresh={onRefresh}
        refreshing={refreshing}
        listHeaderComponent={memoizedListHeader}
        hasMore={hasMoreRegular}
      />
    );
  }

  return (
    <ProductGrid
      products={categoryProducts}
      loading={categoryLoading}
      loadingMore={categoryLoadingMore}
      onLoadMore={loadMoreCategory}
      onRefresh={onRefresh}
      refreshing={categoryLoading}
      listHeaderComponent={null}
      hasMore={hasMoreCategory}
    />
  );
};

export default CategoryScreen;
