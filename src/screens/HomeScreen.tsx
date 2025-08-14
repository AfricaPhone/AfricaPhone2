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
import { usePaginatedProducts } from '../hooks/usePaginatedProducts';

type Nav = ReturnType<typeof useNavigation<any>>;

// --- Constantes ---
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
  const { brands, brandsLoading } = useProducts();
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');
  
  const { products, loading, loadingMore, hasMore, loadMore, refresh } = usePaginatedProducts({ category: activeSegment });

  useEffect(() => {
    refresh();
  }, [activeSegment, refresh]);

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
      
      {/* Onglets de segment */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
            {SEGMENTS.map((s) => {
            const active = s === activeSegment;
            return (
                <Pressable key={s} onPress={() => setActiveSegment(s)} style={styles.segmentBtn}>
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
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeSegment}-${item.id}`}
        numColumns={2}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null}
        onEndReached={() => hasMore && !loadingMore && loadMore()}
        onEndReachedThreshold={0.5}
        columnWrapperStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#FF7A00"
          />
        }
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {loading ? null : <Text style={styles.emptyText}>Aucun produit dans cette catégorie.</Text>}
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
  },
  emptyText: {
      textAlign: 'center',
      color: '#666'
  }
});

export default HomeScreen;
