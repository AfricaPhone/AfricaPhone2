// src/screens/HomeScreen.tsx
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Product, Brand, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import { useProducts } from '../store/ProductContext';

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

// --- Écran principal HomeScreen ---
const HomeScreen: React.FC = () => {
  const nav: Nav = useNavigation<any>();
  const { products, productsLoading, brands, brandsLoading } = useProducts();
  
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');
  
  const [pagination, setPagination] = useState<Record<Segment, { page: number, hasMore: boolean, items: Product[] }>>(() => {
    const initialState = {} as Record<Segment, { page: number, hasMore: boolean, items: Product[] }>;
    SEGMENTS.forEach(seg => {
      initialState[seg] = { page: 0, hasMore: true, items: [] };
    });
    return initialState;
  });

  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // État pour le pull-to-refresh
  const listRef = useRef<FlatList>(null);

  const resetAndInitializePagination = useCallback(() => {
      if (products.length === 0) return;
      
      const newPaginationState = {} as typeof pagination;
      SEGMENTS.forEach(seg => {
          const sourceProducts = seg === 'Populaires' 
            ? products 
            : products.filter(p => p.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === seg.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
          
          const initialItems = sourceProducts.slice(0, PAGE_SIZE);
          newPaginationState[seg] = {
              page: 1,
              hasMore: initialItems.length < sourceProducts.length,
              items: initialItems
          };
      });
      setPagination(newPaginationState);
  }, [products]);

  useEffect(() => {
    resetAndInitializePagination();
  }, [products, resetAndInitializePagination]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simuler un appel réseau
    setTimeout(() => {
      resetAndInitializePagination();
      setRefreshing(false);
    }, 1000);
  }, [resetAndInitializePagination]);

  const handleSegmentPress = (segment: Segment) => {
    if (segment !== activeSegment) {
        setActiveSegment(segment);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  };

  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !pagination[activeSegment].hasMore) return;

    setLoadingMore(true);
    
    setTimeout(() => {
        const currentSegmentState = pagination[activeSegment];
        const nextPage = currentSegmentState.page + 1;

        const sourceProducts = activeSegment === 'Populaires' 
          ? products 
          : products.filter(p => p.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === activeSegment.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

        const newItems = sourceProducts.slice(0, nextPage * PAGE_SIZE);

        setPagination(prev => ({
            ...prev,
            [activeSegment]: {
                page: nextPage,
                hasMore: newItems.length < sourceProducts.length,
                items: newItems
            }
        }));
        setLoadingMore(false);
    }, 500);
  }, [loadingMore, pagination, activeSegment, products]);

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.gridItem}>
      <ProductGridCard
        product={item}
        onPress={() => nav.navigate('ProductDetail' as never, { productId: item.id } as never)}
      />
    </View>
  ), [nav]);

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
      <View style={{ height: 4, backgroundColor: '#f4f4f5', marginBottom: 8 }} />

      {/* Onglets de segment */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
        {SEGMENTS.map((s) => {
          const active = s === activeSegment;
          return (
            <Pressable key={s} onPress={() => handleSegmentPress(s)} style={styles.segmentBtn}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s}</Text>
              <View style={[styles.segmentUnderline, active && styles.segmentUnderlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  if (productsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF7A00"/>
      </View>
    );
  }

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
        ref={listRef}
        data={pagination[activeSegment].items}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${activeSegment}-${item.id}-${index}`}
        numColumns={2}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        columnWrapperStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7A00"
          />
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
  segmentScrollContainer: { paddingHorizontal: 16, marginBottom: 12 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 10, marginRight: 6, alignItems: 'center' },
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
});

export default HomeScreen;
