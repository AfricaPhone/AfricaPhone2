// src/screens/HomeScreen.tsx
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

import { Product, Brand, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import { useProducts } from '../store/ProductContext';
import { db } from '../firebase/config';

type Nav = ReturnType<typeof useNavigation<any>>;

// --- Constantes ---
const PAGE_SIZE = 10;
const SEGMENTS = ['Populaires', 'Tablettes', 'Acessoires', 'Portables a Touches'] as const;
type Segment = typeof SEGMENTS[number];

const PROMO_CARDS: Array<{ id: string; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; color: string; screen?: keyof RootStackParamList }> = [
    { id: 'p-store', icon: 'map-outline', title: 'Notre boutique', subtitle: 'Nous sommes situés à Cotonou', color: '#f0fdf4', screen: 'Store' },
    { id: 'p-70',  icon: 'flash-outline', title: 'Jusqu\'à -70%', subtitle: 'dès 3 articles achetés', color: '#e0f2fe' },
];
  
const FEATURE_TILES: Array<{ id: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string, screen?: keyof RootStackParamList }> = [
    { id: 'f-wheel', icon: 'gamepad-variant-outline', label: 'Jeu pronostique', color: '#fffbeb', screen: 'MatchList' },
    { id: 'f-gift',  icon: 'gift-outline', label: 'Cadeau gratuit', color: '#ecfeff' },
    { id: 'f-60',    icon: 'sale', label: '-60% sur les bijoux', color: '#f5f3ff' },
    { id: 'f-out',   icon: 'store-outline', label: 'Outlet', color: '#f0fdf4' },
    { id: 'f-pick',  icon: 'star-outline', label: 'Populaires', color: '#fff1f2' },
];

// --- Helpers (copié depuis le hook usePaginatedProducts) ---
const mapDocToProduct = (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: data.imageUrl,
    category: data.brand?.toLowerCase() || 'inconnu',
    rating: data.rating || 4.5,
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
  };
};

// --- État pour la gestion du cache par segment ---
interface SegmentData {
  products: Product[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

// --- Écran principal HomeScreen ---
const HomeScreen: React.FC = () => {
  const nav: Nav = useNavigation<any>();
  const { brands, brandsLoading } = useProducts();
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');
  
  // State pour le cache et le chargement
  const [dataBySegment, setDataBySegment] = useState<Partial<Record<Segment, SegmentData>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fonction de chargement principale
  const fetchProducts = useCallback(async (segment: Segment, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
      if (segment && segment !== 'Populaires') {
        const categoryCapitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
        q = query(q, where('category', '==', categoryCapitalized));
      }
      q = query(q, orderBy('name', 'asc'), limit(PAGE_SIZE));

      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      setDataBySegment(prev => ({
        ...prev,
        [segment]: {
          products: newProducts,
          lastDoc: lastVisible,
          hasMore: newProducts.length === PAGE_SIZE,
        }
      }));

    } catch (error) {
      console.error(`Erreur de chargement pour le segment ${segment}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Chargement des données initiales
  useEffect(() => {
    fetchProducts('Populaires');
  }, [fetchProducts]);

  // Gestion du changement de segment
  const handleSegmentChange = (segment: Segment) => {
    setActiveSegment(segment);
    if (!dataBySegment[segment]) {
      fetchProducts(segment);
    }
  };
  
  // Pagination
  const loadMore = useCallback(async () => {
    const segmentState = dataBySegment[activeSegment];

    if (loadingMore || !segmentState || !segmentState.hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
       if (activeSegment && activeSegment !== 'Populaires') {
        const categoryCapitalized = activeSegment.charAt(0).toUpperCase() + activeSegment.slice(1);
        q = query(q, where('category', '==', categoryCapitalized));
      }
      q = query(q, orderBy('name', 'asc'), startAfter(segmentState.lastDoc), limit(PAGE_SIZE));

      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      setDataBySegment(prev => ({
        ...prev,
        [activeSegment]: {
          products: [...(prev[activeSegment]?.products || []), ...newProducts],
          lastDoc: lastVisible,
          hasMore: newProducts.length === PAGE_SIZE,
        }
      }));

    } catch (error) {
      console.error(`Erreur de pagination pour ${activeSegment}:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeSegment, dataBySegment, loadingMore]);


  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.gridItem}>
      <ProductGridCard
        product={item}
        onPress={() => nav.navigate('ProductDetail' as never, { productId: item.id } as never)}
      />
    </View>
  ), [nav]);
  
  const currentData = dataBySegment[activeSegment]?.products || [];

  const HeaderComponent = (
    <>
      {/* Carrousel des marques */}
      {brandsLoading ? <ActivityIndicator style={{ marginVertical: 20 }} /> :
        <FlatList
          data={brands}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandCarousel}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }: { item: Brand }) => (
            <TouchableOpacity onPress={() => nav.navigate('Brand', { brandId: item.id })} activeOpacity={0.8}>
              <View style={styles.circle}><Image source={{ uri: item.logoUrl }} style={styles.circleImg} /></View>
              <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      }
      
      {/* Promo strip cards */}
      <FlatList
        data={PROMO_CARDS}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => item.screen && nav.navigate(item.screen as never)}>
            <View style={[styles.promoCard, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={22} color="#111" />
              <View style={{ marginLeft: 10 }}><Text style={styles.promoTitle}>{item.title}</Text><Text style={styles.promoSub}>{item.subtitle}</Text></View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Feature tiles row */}
      <FlatList
        data={FEATURE_TILES}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.featureTile, { backgroundColor: item.color }]} onPress={() => item.screen && nav.navigate(item.screen as never)} activeOpacity={0.8}>
            <MaterialCommunityIcons name={item.icon} size={20} color="#111" />
            <Text numberOfLines={1} style={styles.featureLabel}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
      
      {/* Onglets de segment */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
            {SEGMENTS.map((s) => {
            const active = s === activeSegment;
            return (
                <Pressable key={s} onPress={() => handleSegmentChange(s)} style={styles.segmentBtn}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s}</Text>
                <View style={[styles.segmentUnderline, active && styles.segmentUnderlineActive]} />
                </Pressable>
            );
            })}
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Barre de recherche FIXE */}
      <View style={styles.fixedHeader}>
        <Pressable onPress={() => nav.navigate('Catalog' as never)} style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#8A8A8E" />
            <Text style={styles.searchPlaceholder}>Rechercher</Text>
            <Ionicons name="camera-outline" size={20} color="#8A8A8E" />
        </Pressable>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeSegment}-${item.id}`}
        numColumns={2}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        columnWrapperStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(activeSegment, true)}
            tintColor="#FF7A00"
          />
        }
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {loading && !refreshing ? <ActivityIndicator size="large" color="#FF7A00" /> : <Text style={styles.emptyText}>Aucun produit dans cette catégorie.</Text>}
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: { 
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#F2F3F5', borderRadius: 16, height: 44, 
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' 
  },
  searchPlaceholder: { color: '#8A8A8E', fontSize: 15, marginLeft: 8, flex: 1 },
  brandCarousel: { paddingHorizontal: 16, paddingVertical: 12, },
  circle: { 
    width: 68, height: 68, borderRadius: 34, 
    backgroundColor: '#F2F3F5', overflow: 'hidden', 
    alignItems: 'center', justifyContent: 'center' 
  },
  circleImg: { width: '100%', height: '100%' },
  circleLabel: { 
    textAlign: 'center', width: 68, marginTop: 6, 
    fontSize: 12, color: '#111' 
  },
  promoCard: { 
    height: 64, borderRadius: 12, borderWidth: 1, 
    borderColor: '#eee', paddingHorizontal: 12, 
    alignItems: 'center', flexDirection: 'row' 
  },
  promoTitle: { fontWeight: '700', fontSize: 14, color: '#111' },
  promoSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  featureTile: { 
    width: 120, height: 56, borderRadius: 12, 
    borderWidth: 1, borderColor: '#eee', 
    paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row' 
  },
  featureLabel: { marginLeft: 8, fontSize: 12, fontWeight: '600', color: '#111', flexShrink: 1 },
  segmentContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  segmentScrollContainer: { paddingHorizontal: 16 },
  segmentBtn: { paddingVertical: 12, paddingHorizontal: 10, marginRight: 6, alignItems: 'center' },
  segmentText: { fontSize: 16, color: '#8A8A8E', fontWeight: '600' },
  segmentTextActive: { color: '#FF7A00' },
  segmentUnderline: { height: 3, width: '80%', marginTop: 6, borderRadius: 2, backgroundColor: 'transparent' },
  segmentUnderlineActive: { backgroundColor: '#FF7A00' },
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
      textAlign: 'center',
      color: '#666'
  }
});

export default HomeScreen;