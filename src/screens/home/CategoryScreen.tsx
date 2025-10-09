import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import ProductGrid from './ProductGrid';
import PromoCardsCarousel from './PromoCardsCarousel';
import BrandCarousel from './BrandCarousel';
import { Product } from '../../types';
import { db } from '../../firebase/config';
import { usePromoCards } from '../../hooks/usePromoCards';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useProducts } from '../../store/ProductContext';

const PAGE_SIZE = 16;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80';

type Snapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const productsCollection = collection(db, 'products');

const mapDocToProduct = (doc: Snapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || FALLBACK_IMAGE,
    imageUrls,
    category: data.category?.toLowerCase() || data.brand?.toLowerCase() || 'inconnu',
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
    ordreVedette: data.ordreVedette,
    isVedette: data.ordreVedette > 0,
    enPromotion: data.enPromotion,
  };
};

const uniqueProducts = (items: Product[]): Product[] =>
  Array.from(new Map(items.map(item => [item.id, item])).values());

const CategoryScreen = ({ route }: { route: { params: { category: string } } }) => {
  const { category } = route.params;
  const { promoCardsEnabled } = useFeatureFlags();
  const { promoCards, loading: promoLoading } = usePromoCards(category === 'Populaires' && promoCardsEnabled);
  const { brands, brandsLoading } = useProducts();

  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<Snapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShowBrands = brandsLoading || brands.length > 0;
  const shouldShowPromos = promoLoading || promoCards.length > 0;

  const buildQuery = useCallback(
    (cursor: Snapshot | null = null): FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> => {
      let queryRef: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = productsCollection;

      if (category === 'Populaires') {
        queryRef = query(queryRef, orderBy('ordreVedette', 'desc'), orderBy('name', 'asc'));
      } else {
        queryRef = query(queryRef, where('category', '==', category), orderBy('name', 'asc'));
      }

      queryRef = query(queryRef, limit(PAGE_SIZE));

      if (cursor) {
        queryRef = query(queryRef, startAfter(cursor));
      }

      return queryRef;
    },
    [category]
  );

  const fetchData = useCallback(
    async (isRefresh: boolean = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        setError(null);
        const snapshot = await getDocs(buildQuery());
        const fetched = snapshot.docs.map(mapDocToProduct);
        setProducts(uniqueProducts(fetched));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(fetched.length === PAGE_SIZE);
      } catch (err) {
        console.error(`Erreur de chargement pour la catégorie "${category}"`, err);
        setError('Impossible de charger les produits pour le moment.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery, category]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) {
      return;
    }
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(buildQuery(lastDoc));
      const nextProducts = snapshot.docs.map(mapDocToProduct);
      if (nextProducts.length > 0) {
        setProducts(prev => uniqueProducts([...prev, ...nextProducts]));
      }
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(nextProducts.length === PAGE_SIZE);
    } catch (err) {
      console.error(`Erreur de chargement additionnel pour "${category}"`, err);
      setError('Une erreur est survenue lors du chargement supplémentaire.');
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, category, hasMore, lastDoc, loadingMore]);

  useEffect(() => {
    fetchData();
  }, [fetchData, category]);

  const header = useMemo(() => {
    if (category !== 'Populaires') {
      return (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <Text style={styles.categorySubtitle}>Sélection premium et stock garanti</Text>
        </View>
      );
    }

    return (
      <View style={styles.popularHero}>
        <LinearGradient
          colors={['#0f172a', '#1f2937']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.popularGradient}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.popularTag}>Sélection AfricaPhone</Text>
            <Text style={styles.popularTitle}>Populaires cette semaine</Text>
            <Text style={styles.popularDescription}>
              Les références les plus recherchées, prêtes à être livrées en 24 h sur Cotonou.
            </Text>
          </View>
          <TouchableOpacity style={styles.popularCta} onPress={() => fetchData(true)} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color="#0f172a" />
            <Text style={styles.popularCtaText}>Actualiser</Text>
          </TouchableOpacity>
        </LinearGradient>
        {shouldShowBrands ? <BrandCarousel brands={brands} isLoading={brandsLoading} showAllCta /> : null}
        {shouldShowPromos ? <PromoCardsCarousel promoCards={promoCards} isLoading={promoLoading} /> : null}
      </View>
    );
  }, [brands, brandsLoading, category, fetchData, promoCards, promoLoading, shouldShowBrands, shouldShowPromos]);

  return (
    <ProductGrid
      products={products}
      loading={loading}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
      listHeaderComponent={header}
      hasMore={hasMore}
      error={error}
      onRetry={() => fetchData(true)}
    />
  );
};

const styles = StyleSheet.create({
  popularHero: {
    gap: 12,
    paddingBottom: 12,
  },
  popularGradient: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  popularDescription: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  popularCta: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popularCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default CategoryScreen;
