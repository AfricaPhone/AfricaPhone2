// src/screens/HomeScreen.tsx
import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  TouchableOpacity, ScrollView, LayoutChangeEvent, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Product, Brand, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import { useProducts } from '../store/ProductContext';

type Nav = ReturnType<typeof useNavigation<any>>;

// --- Mocks & Constants ---
const { width: screenWidth } = Dimensions.get('window');

const SEGMENTS = ['Top', 'Promotions', 'Best-sellers', 'Nouveautés'] as const;
type Segment = typeof SEGMENTS[number];

// MODIFICATION: Ajout de la navigation vers l'écran de la boutique
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

const TAB_BAR_HEIGHT = 58;
const COUPON_BANNER_HEIGHT = 44;

function makeFeed(products: Product[], seg: Segment): Array<{ key: string; product: Product; promoted?: boolean }> {
  const base = [...products];
  
  if (base.length === 0) return [];

  if (seg === 'Promotions') base.reverse();
  if (seg === 'Best-sellers') base.sort((a, b) => a.title.localeCompare(b.title));
  if (seg === 'Nouveautés') base.sort((a, b) => b.title.localeCompare(a.title));

  const items: Array<{ key: string; product: Product; promoted?: boolean }> = [];
  const loopCount = Math.min(10, base.length);
  for (let i = 0; i < loopCount; i++) {
    const p = base[i];
    items.push({ key: `${p.id}-${seg}-${i}`, product: p, promoted: i % 5 === 0 });
  }
  return items;
}

const HomeScreen: React.FC = () => {
  const nav: Nav = useNavigation<any>();
  const { products, productsLoading, brands, brandsLoading } = useProducts();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('Top');
  const [couponDismissed, setCouponDismissed] = useState(false);
  const [headerH, setHeaderH] = useState<number>(60);
  const pagerRef = useRef<FlatList>(null);

  const feeds = useMemo(() => {
    if (productsLoading) {
        return SEGMENTS.map(s => ({ key: s, products: [] }));
    }
    return SEGMENTS.map(s => ({ key: s, products: makeFeed(products, s) }))
  }, [products, productsLoading]);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && height !== headerH) {
      setHeaderH(height);
    }
  };

  const listPaddingBottom = useMemo(() => {
    let padding = TAB_BAR_HEIGHT + insets.bottom;
    if (!couponDismissed) {
      padding += COUPON_BANNER_HEIGHT + 8;
    }
    return padding;
  }, [insets.bottom, couponDismissed]);

  const onSegmentPress = (index: number) => {
    setSegment(SEGMENTS[index]);
    pagerRef.current?.scrollToIndex({ index, animated: false });
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    const visibleItem = viewableItems.find(item => item.isViewable);
    if (visibleItem) {
      const activeSegmentKey = visibleItem.item.key;
      setSegment(activeSegmentKey);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderPage = useCallback(({ item }: { item: typeof feeds[0] }) => (
    <View style={styles.pageContainer}>
      {item.products.map((productItem) => (
        <View key={productItem.key} style={{ width: '48%' }}>
          <ProductGridCard
            product={productItem.product}
            promoted={productItem.promoted}
            onPress={() => nav.navigate('ProductDetail' as never, { productId: productItem.product.id } as never)}
          />
        </View>
      ))}
    </View>
  ), [nav]);

  if (productsLoading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>
  }

  return (
    <View style={styles.container}>
      {/* Pinned Header */}
      <SafeAreaView edges={['top']} style={styles.pinnedSafe} onLayout={onHeaderLayout}>
        <View style={styles.pinnedHeader}>
          <Pressable onPress={() => nav.navigate('Catalog' as never)} style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#8A8A8E" />
            <Text style={styles.searchPlaceholder}>Rechercher</Text>
            <Ionicons name="camera-outline" size={20} color="#8A8A8E" />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => 'main'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerH, paddingBottom: listPaddingBottom }}
        ListHeaderComponent={
          <>
            {/* Categories carousel */}
            {brandsLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={brands}
                keyExtractor={(i) => i.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item }: { item: Brand }) => (
                  <TouchableOpacity
                    onPress={() => nav.navigate('Brand', { brandId: item.id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.circle}><Image source={{ uri: item.logoUrl }} style={styles.circleImg} /></View>
                    <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Segmented tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
              {SEGMENTS.map((s, index) => {
                const active = s === segment;
                return (
                  <Pressable
                    key={s}
                    onPress={() => onSegmentPress(index)}
                    style={styles.segmentBtn}
                    android_ripple={{ color: '#ddd', borderless: false }}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s}</Text>
                    <View style={[styles.segmentUnderline, active && styles.segmentUnderlineActive]} />
                  </Pressable>
                );
              })}
            </ScrollView>

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
                <TouchableOpacity
                  style={[styles.featureTile, { backgroundColor: item.color }]}
                  onPress={() => item.screen && nav.navigate(item.screen as never)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={item.icon} size={20} color="#111" />
                  <Text numberOfLines={1} style={styles.featureLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={{ height: 4, backgroundColor: '#f4f4f5', marginBottom: 8 }} />
            
            {/* Content Pager */}
            <FlatList
              ref={pagerRef}
              data={feeds}
              keyExtractor={(item) => item.key}
              renderItem={renderPage}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              scrollEventThrottle={16}
            />
          </>
        }
      />

      {/* Gradient coupon banner (sticky) */}
      {!couponDismissed && (
        <LinearGradient
          colors={['#ff70c8', '#a36bff']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.coupon, { bottom: TAB_BAR_HEIGHT + insets.bottom + 8 }]}
        >
          <Text style={styles.couponText}>Coupon de -25% expire le 10 août</Text>
          <TouchableOpacity onPress={() => setCouponDismissed(true)} style={styles.couponClose}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  pinnedSafe: { backgroundColor: '#fff', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  pinnedHeader: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff' },
  searchBar: { backgroundColor: '#F2F3F5', borderRadius: 16, height: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  searchPlaceholder: { color: '#8A8A8E', fontSize: 15, marginLeft: 8, flex: 1 },
  circle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#F2F3F5', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  circleImg: { width: '100%', height: '100%' },
  circleLabel: { textAlign: 'center', width: 68, marginTop: 6, fontSize: 12, color: '#111' },
  segmentScrollContainer: { paddingHorizontal: 16, marginBottom: 8 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 10, marginRight: 6, alignItems: 'center', overflow: 'hidden' },
  segmentText: { fontSize: 16, color: '#8A8A8E', fontWeight: '600' },
  segmentTextActive: { color: '#FF7A00' },
  segmentUnderline: { height: 3, width: '80%', marginTop: 6, borderRadius: 2, backgroundColor: 'transparent' },
  segmentUnderlineActive: { backgroundColor: '#FF7A00' },
  promoCard: { height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row' },
  promoTitle: { fontWeight: '700', fontSize: 14, color: '#111' },
  promoSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  featureTile: { width: 120, height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row' },
  featureLabel: { marginLeft: 8, fontSize: 12, fontWeight: '600', color: '#111', flexShrink: 1 },
  coupon: { position: 'absolute', left: 16, right: 16, height: COUPON_BANNER_HEIGHT, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  couponText: { color: '#fff', fontWeight: '700', flex: 1 },
  couponClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  pageContainer: {
    width: screenWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
  },
});

export default HomeScreen;
