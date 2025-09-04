// src/screens/home/HomeScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { Product, PromoCard } from '../../types';
import { useProducts } from '../../store/ProductContext';
import { db } from '../../firebase/config';

// Import des composants
import HomeHeader from './HomeHeader';
import HomeListHeader from './HomeListHeader';
import ProductGrid from './ProductGrid';
import FilterBottomSheet, { Capacity } from './FilterBottomSheet';
import { Segment } from './ProductSegments';

// --- Constantes ---
const PAGE_SIZE = 10;

// --- Helpers ---
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

interface SegmentData {
  products: Product[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

// --- Écran principal HomeScreen ---
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { brands, brandsLoading } = useProducts();
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');
  const [vedetteProducts, setVedetteProducts] = useState<Product[]>([]);
  const [regularProducts, setRegularProducts] = useState<SegmentData>({ products: [], lastDoc: null, hasMore: true });
  const [dataBySegment, setDataBySegment] = useState<Partial<Record<Segment, SegmentData>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [promoCardsLoading, setPromoCardsLoading] = useState(true);

  // --- Animation de l'en-tête ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight > 0 ? headerHeight : 1],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      // Ne rien faire si la hauteur n'est pas encore calculée
      if (headerHeight === 0) return;

      // Si on a dépassé la hauteur de l'en-tête
      if (currentScrollY > headerHeight) {
        // Si on défile vers le bas (scroll down), on cache l'en-tête
        if (currentScrollY > lastScrollY.current) {
          Animated.timing(scrollY, {
            toValue: headerHeight,
            duration: 250,
            useNativeDriver: true,
          }).start();
        } else {
          // Si on défile vers le haut (scroll up), on montre l'en-tête
          Animated.timing(scrollY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      } else {
        // Si on est dans la zone de l'en-tête, on suit le scroll
        Animated.timing(scrollY, {
          toValue: currentScrollY < 0 ? 0 : currentScrollY,
          duration: 0, // Pas d'animation pour un suivi direct
          useNativeDriver: true,
        }).start();
      }
      lastScrollY.current = currentScrollY;
    },
  });

  useEffect(() => {
    const fetchPromoCards = async () => {
      try {
        setPromoCardsLoading(true);
        const promoCardsQuery = query(
          collection(db, 'promoCards'),
          where('isActive', '==', true),
          orderBy('sortOrder', 'asc')
        );
        const querySnapshot = await getDocs(promoCardsQuery);
        const fetchedCards = querySnapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
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
  }, []);

  const fetchProducts = useCallback(
    async (segment: Segment, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      const isCached = segment === 'Populaires' ? vedetteProducts.length > 0 : !!dataBySegment[segment];
      if (!isCached && !isRefresh) {
        setLoading(true);
      }

      try {
        if (segment === 'Populaires') {
          const vedetteQuery = query(
            collection(db, 'products'),
            where('ordreVedette', '>=', 1),
            where('ordreVedette', '<=', 6),
            orderBy('ordreVedette', 'asc')
          );
          const vedetteSnapshot = await getDocs(vedetteQuery);
          const fetchedVedette = vedetteSnapshot.docs.map(mapDocToProduct);
          setVedetteProducts(fetchedVedette);

          const regularQuery = query(
            collection(db, 'products'),
            where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
            orderBy('ordreVedette', 'asc'),
            orderBy('name', 'asc'),
            limit(PAGE_SIZE)
          );
          const regularSnapshot = await getDocs(regularQuery);
          const fetchedRegular = regularSnapshot.docs.map(mapDocToProduct);
          const lastVisible = regularSnapshot.docs[regularSnapshot.docs.length - 1] || null;
          setRegularProducts({
            products: fetchedRegular,
            lastDoc: lastVisible,
            hasMore: fetchedRegular.length === PAGE_SIZE,
          });
        } else {
          let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
          if (segment === 'Portables a Touches') {
            q = query(q, where('ram', '==', null), orderBy('name', 'asc'));
          } else {
            const categoryCapitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
            q = query(q, where('category', '==', categoryCapitalized), orderBy('name', 'asc'));
          }
          q = query(q, limit(PAGE_SIZE));

          const querySnapshot = await getDocs(q);
          const newProducts = querySnapshot.docs.map(mapDocToProduct);
          const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
          setDataBySegment(prev => ({
            ...prev,
            [segment]: { products: newProducts, lastDoc: lastVisible, hasMore: newProducts.length === PAGE_SIZE },
          }));
        }
      } catch (error) {
        console.error(`Erreur de chargement pour le segment ${segment}:`, error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dataBySegment, vedetteProducts]
  );

  useEffect(() => {
    const isCached = activeSegment === 'Populaires' ? vedetteProducts.length > 0 : !!dataBySegment[activeSegment];
    if (!isCached) {
      fetchProducts(activeSegment);
    }
  }, [activeSegment, dataBySegment, vedetteProducts, fetchProducts]);

  const loadMore = useCallback(async () => {
    const segmentState = activeSegment === 'Populaires' ? regularProducts : dataBySegment[activeSegment];
    if (loadingMore || !segmentState || !segmentState.hasMore) return;

    setLoadingMore(true);
    try {
      let q: FirebaseFirestoreTypes.Query = collection(db, 'products');

      if (activeSegment === 'Populaires') {
        q = query(
          q,
          where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
          orderBy('ordreVedette', 'asc'),
          orderBy('name', 'asc')
        );
      } else if (activeSegment === 'Portables a Touches') {
        q = query(q, where('ram', '==', null), orderBy('name', 'asc'));
      } else {
        const categoryCapitalized = activeSegment.charAt(0).toUpperCase() + activeSegment.slice(1);
        q = query(q, where('category', '==', categoryCapitalized), orderBy('name', 'asc'));
      }

      q = query(q, startAfter(segmentState.lastDoc), limit(PAGE_SIZE));
      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      if (activeSegment === 'Populaires') {
        setRegularProducts(prev => ({
          products: [...prev.products, ...newProducts],
          lastDoc: lastVisible,
          hasMore: newProducts.length === PAGE_SIZE,
        }));
      } else {
        setDataBySegment(prev => ({
          ...prev,
          [activeSegment]: {
            products: [...(prev[activeSegment]?.products || []), ...newProducts],
            lastDoc: lastVisible,
            hasMore: newProducts.length === PAGE_SIZE,
          },
        }));
      }
    } catch (error) {
      console.error(`Erreur de pagination pour ${activeSegment}:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeSegment, dataBySegment, regularProducts, loadingMore]);

  const currentData =
    activeSegment === 'Populaires'
      ? [...vedetteProducts, ...regularProducts.products]
      : dataBySegment[activeSegment]?.products || [];

  const handleApplyFilter = (minPrice: string, maxPrice: string, capacity?: Capacity) => {
    setIsFilterVisible(false);
    navigation.navigate('FilterScreenResults', {
      minPrice,
      maxPrice,
      initialCategory: activeSegment !== 'Populaires' ? activeSegment : undefined,
      rom: capacity?.rom,
      ram: capacity?.ram,
    });
  };

  const onRefresh = useCallback(() => {
    fetchProducts(activeSegment, true);
  }, [activeSegment, fetchProducts]);

  const listHeader = (
    <Animated.View
      style={{ transform: [{ translateY: headerTranslateY }] }}
      onLayout={event => {
        setHeaderHeight(event.nativeEvent.layout.height);
      }}
    >
      <HomeListHeader
        brands={brands}
        brandsLoading={brandsLoading}
        promoCards={promoCards}
        promoCardsLoading={promoCardsLoading}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader onFilterPress={() => setIsFilterVisible(true)} />
      <ProductGrid
        products={currentData}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        onRefresh={onRefresh}
        refreshing={refreshing}
        activeSegment={activeSegment}
        listHeaderComponent={listHeader}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApplyFilter={handleApplyFilter}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;
