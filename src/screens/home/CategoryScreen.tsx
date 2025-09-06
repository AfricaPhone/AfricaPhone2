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

// Fonction utilitaire pour dédupliquer la liste de produits
const getUniqueProducts = (products: Product[]): Product[] => {
  return Array.from(new Map(products.map(p => [p.id, p])).values());
};

const CategoryScreen = ({ route }: any) => {
  const { category } = route.params;

  // --- MODIFICATION: Logique simplifiée pour l'onglet "Populaires" ---
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const [hasMorePopulars, setHasMorePopulars] = useState(true);

  // États pour les autres onglets (inchangés)
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

  // États pour l'en-tête (inchangés)
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
      // Fetch vedette products
      const vedetteQuery = query(
        collection(db, 'products'),
        where('ordreVedette', '>=', 1),
        where('ordreVedette', '<=', 6),
        orderBy('ordreVedette', 'asc')
      );
      const vedetteSnapshot = await getDocs(vedetteQuery);
      const fetchedVedette = vedetteSnapshot.docs.map(mapDocToProduct);

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

      // --- MODIFICATION: Fusionner, dédupliquer et mettre à jour l'état une seule fois ---
      setPopularProducts(getUniqueProducts([...fetchedVedette, ...fetchedRegular]));
      setLastDoc(regularSnapshot.docs[regularSnapshot.docs.length - 1] || null);
      setHasMorePopulars(fetchedRegular.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching popular products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMorePopulars = useCallback(async () => {
    if (loadingMore || !hasMorePopulars || !lastDoc) return;
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

      // --- MODIFICATION: Ajouter les nouveaux produits et dédupliquer à nouveau ---
      if (newProducts.length > 0) {
        setPopularProducts(prevProducts => getUniqueProducts([...prevProducts, ...newProducts]));
      }

      setLastDoc(regularSnapshot.docs[regularSnapshot.docs.length - 1] || null);
      setHasMorePopulars(newProducts.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more popular products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMorePopulars]);

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
        products={popularProducts}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMorePopulars}
        onRefresh={onRefresh}
        refreshing={refreshing}
        listHeaderComponent={memoizedListHeader}
        hasMore={hasMorePopulars}
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