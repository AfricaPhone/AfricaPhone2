// src/screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput
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
import CustomBottomSheet from '../components/CustomBottomSheet'; 
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

// --- Helpers ---
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

interface SegmentData {
  products: Product[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

const buildSegmentQuery = (
  segment: Segment,
): FirebaseFirestoreTypes.Query => {
    let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
    
    if (segment === 'Portables a Touches') {
        q = query(q, where('ram', '==', null));
    } else if (segment && segment !== 'Populaires') {
        const categoryCapitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
        q = query(q, where('category', '==', categoryCapitalized));
    }
    
    q = query(q, orderBy('name', 'asc'));
    
    return q;
};

// --- Écran principal HomeScreen ---
const HomeScreen: React.FC = () => {
  const nav: Nav = useNavigation<any>();
  const { brands, brandsLoading } = useProducts();
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');
  
  const [dataBySegment, setDataBySegment] = useState<Partial<Record<Segment, SegmentData>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Filtres temporaires pour le modal
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = useCallback(async (
    segment: Segment, 
    isRefresh = false,
  ) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      let q = buildSegmentQuery(segment);
      q = query(q, limit(PAGE_SIZE));
      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setDataBySegment(prev => ({ ...prev, [segment]: { products: newProducts, lastDoc: lastVisible, hasMore: newProducts.length === PAGE_SIZE }}));
    } catch (error) { console.error(`Erreur de chargement pour le segment ${segment}:`, error); } 
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { 
    fetchProducts(activeSegment);
  }, [fetchProducts, activeSegment]);

  const handleSegmentChange = (segment: Segment) => {
    setActiveSegment(segment);
  };
  
  const loadMore = useCallback(async () => {
    const segmentState = dataBySegment[activeSegment];
    if (loadingMore || !segmentState || !segmentState.hasMore) return;
    setLoadingMore(true);
    try {
      let q = buildSegmentQuery(activeSegment);
      q = query(q, startAfter(segmentState.lastDoc), limit(PAGE_SIZE));
      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setDataBySegment(prev => ({ ...prev, [activeSegment]: { products: [...(prev[activeSegment]?.products || []), ...newProducts], lastDoc: lastVisible, hasMore: newProducts.length === PAGE_SIZE }}));
    } catch (error) { console.error(`Erreur de pagination pour ${activeSegment}:`, error); } 
    finally { setLoadingMore(false); }
  }, [activeSegment, dataBySegment, loadingMore]);

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.gridItem}><ProductGridCard product={item} onPress={() => nav.navigate('ProductDetail' as never, { productId: item.id } as never)}/></View>
  ), [nav]);
  
  const currentData = dataBySegment[activeSegment]?.products || [];
  
  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setIsFilterVisible(false);
  }

  const handleApplyFilter = () => {
    setIsFilterVisible(false);
    nav.navigate('FilterScreenResults', { 
        minPrice: minPrice, 
        maxPrice: maxPrice,
        initialCategory: activeSegment !== 'Populaires' ? activeSegment : undefined
    });
  }

  const HeaderComponent = (
    <>
      {brandsLoading ? <ActivityIndicator style={{ marginVertical: 20 }} /> :
        <FlatList data={brands} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandCarousel} ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }: { item: Brand }) => (
            <TouchableOpacity onPress={() => nav.navigate('Brand', { brandId: item.id })} activeOpacity={0.8}>
              <View style={styles.circle}><Image source={{ uri: item.logoUrl }} style={styles.circleImg} /></View>
              <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      }
      <FlatList data={PROMO_CARDS} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }} ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => item.screen && nav.navigate(item.screen as never)}>
            <View style={[styles.promoCard, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={22} color="#111" />
              <View style={{ marginLeft: 10 }}><Text style={styles.promoTitle}>{item.title}</Text><Text style={styles.promoSub}>{item.subtitle}</Text></View>
            </View>
          </TouchableOpacity>
        )}
      />
      <FlatList data={FEATURE_TILES} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }} ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.featureTile, { backgroundColor: item.color }]} onPress={() => item.screen && nav.navigate(item.screen as never)} activeOpacity={0.8}>
            <MaterialCommunityIcons name={item.icon} size={20} color="#111" />
            <Text numberOfLines={1} style={styles.featureLabel}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
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
      <View style={styles.fixedHeader}>
        <View style={styles.searchContainer}>
          <Pressable onPress={() => nav.navigate('Catalog' as never)} style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#8A8A8E" />
              <Text style={styles.searchPlaceholder}>Rechercher</Text>
          </Pressable>
          <TouchableOpacity onPress={() => setIsFilterVisible(true)} style={styles.filterButton}>
            <MaterialCommunityIcons name="filter-variant" size={18} color="#111" />
            <Text style={styles.filterButtonText}>Filtrer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={currentData} renderItem={renderItem} keyExtractor={(item) => `${activeSegment}-${item.id}`} numColumns={2}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null}
        onEndReached={loadMore} onEndReachedThreshold={0.5} columnWrapperStyle={styles.gridContainer} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10 }}
        refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(activeSegment, true)} tintColor="#FF7A00"/> }
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {loading && !refreshing ? <ActivityIndicator size="large" color="#FF7A00" /> : <Text style={styles.emptyText}>Aucun produit dans cette catégorie.</Text>}
            </View>
        }
      />

      <CustomBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
              <Ionicons name="close-circle" size={26} color="#ccc" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Prix</Text>
            <View style={styles.priceInputsRow}>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="numeric"
                  placeholder="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceUnit}>FCFA</Text>
              </View>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="numeric"
                  placeholder="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
                <Text style={styles.priceUnit}>FCFA</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.showButton}
            onPress={handleApplyFilter}
          >
            <Text style={styles.showButtonText}>Voir les résultats</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      </CustomBottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 12,
  },
  searchBar: { 
    flex: 1,
    backgroundColor: '#F2F3F5', 
    borderRadius: 16, 
    height: 44, 
    paddingHorizontal: 12, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  filterButton: {
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 6,
  },
  filterButtonText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 15,
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
  },
  sheetContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  filterSection: { 
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f3f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  priceInput: {
    flex: 1,
    color: '#111',
    fontSize: 16,
  },
  priceUnit: {
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '600',
  },
  showButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  showButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButtonText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
