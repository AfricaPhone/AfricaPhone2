import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { GridSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import RatingStars from '../components/RatingStars';
import { useStore } from '../store/StoreContext';

type RouteParams = { category?: Category };
type SortKey = 'relevance' | 'priceAsc' | 'priceDesc' | 'ratingDesc';
type ViewMode = 'grid' | 'list';

const { width } = Dimensions.get('window');

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialCategory: Category | undefined = route?.params?.category;
  const { products, productsLoading } = useStore();

  // --- State Management ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(Infinity);
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [headerH, setHeaderH] = useState<number>(60);

  // --- Data Fetching & Filtering ---
  const baseProducts: Product[] = useMemo(() => {
    if (!category) return products;
    return products.filter(p => p.category === category);
  }, [category, products]);

  const filteredProducts: Product[] = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let out = baseProducts.filter((p) => {
      const okText = q ? p.title.toLowerCase().includes(q) : true;
      const okPrice = p.price >= priceMin && (Number.isFinite(priceMax) ? p.price <= priceMax : true);
      const r = p.rating ?? 0;
      const okRating = r >= ratingMin;
      return okText && okPrice && okRating;
    });

    switch (sort) {
      case 'priceAsc': out.sort((a, b) => a.price - b.price); break;
      case 'priceDesc': out.sort((a, b) => b.price - a.price); break;
      case 'ratingDesc': out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
    }
    
    return out;
  }, [baseProducts, debouncedQuery, priceMin, priceMax, ratingMin, sort]);

  // --- UI Helpers ---
  const hasActiveFilters = ratingMin > 0 || priceMin > 0 || Number.isFinite(priceMax);
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== headerH) setHeaderH(h);
  };
  const listRef = useRef<FlatList<Product>>(null);

  const clearFilters = () => {
    setRatingMin(0);
    setPriceMin(0);
    setPriceMax(Infinity);
  };
  
  const renderItem = useCallback(({ item }: { item: Product }) => {
    const props = {
      product: item,
      onPress: () => navigation.navigate('ProductDetail', { productId: item.id }),
    };
    if (viewMode === 'grid') {
      return <View style={{ width: '48%' }}><ProductGridCard {...props} /></View>;
    }
    return <View style={{ paddingHorizontal: 16 }}><ProductListItem {...props} /></View>;
  }, [viewMode, navigation]);

  const ListSkeletonComponent = () => (
    <View style={{ paddingTop: headerH + 10 }}>
      {viewMode === 'grid' ? (
        <View style={styles.gridContainer}>
          {Array.from({ length: 6 }).map((_, i) => <GridSkeleton key={i} />)}
        </View>
      ) : (
        Array.from({ length: 4 }).map((_, i) => <ListSkeleton key={i} />)
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Pinned Header */}
      <SafeAreaView edges={['top']} style={styles.pinnedSafe} onLayout={onHeaderLayout}>
        <View style={styles.pinnedHeader}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#8A8A8E" />
            <TextInput
              placeholder="Rechercher des produits…"
              placeholderTextColor="#8A8A8E"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.actionsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setViewMode('grid')} style={styles.viewBtn}>
                <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#111' : '#999'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setViewMode('list')} style={styles.viewBtn}>
                <Ionicons name="list" size={22} color={viewMode === 'list' ? '#111' : '#999'} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10 }}>
              <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.actionBtn}>
                <MaterialCommunityIcons name="filter-variant" size={18} color="#111" />
                <Text style={styles.actionBtnTxt}>Filtres</Text>
                {hasActiveFilters && <View style={styles.dotBadge} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Product List */}
      {productsLoading ? (
        <ListSkeletonComponent />
      ) : (
        <FlatList
          ref={listRef}
          data={filteredProducts}
          key={viewMode} // Change key to force re-render on view mode change
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          contentContainerStyle={{ paddingTop: headerH, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit trouvé.</Text>
              <Text style={styles.emptySubText}>Essayez d'ajuster votre recherche ou vos filtres.</Text>
            </View>
          }
        />
      )}

      {/* Filter Panel (Side Modal) */}
      <Modal visible={filtersOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}>
              <Ionicons name="close-circle" size={26} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Trier par</Text>
            <View style={styles.pillsRow}>
              {(['relevance', 'priceAsc', 'priceDesc', 'ratingDesc'] as SortKey[]).map(s => (
                <TouchableOpacity key={s} onPress={() => setSort(s)} style={[styles.pill, sort === s && styles.pillActive]}>
                  <Text style={[styles.pillTxt, sort === s && styles.pillTxtActive]}>
                    {s === 'relevance' ? 'Pertinence' : s === 'priceAsc' ? 'Prix ↑' : s === 'priceDesc' ? 'Prix ↓' : 'Mieux notés'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Notes minimales</Text>
            <View style={styles.pillsRow}>
              {[4.5, 4, 3, 0].map(r => (
                <TouchableOpacity key={r} onPress={() => setRatingMin(r)} style={[styles.pill, ratingMin === r && styles.pillActive]}>
                  <Text style={[styles.pillTxt, ratingMin === r && styles.pillTxtActive]}>{r === 0 ? 'Toutes' : `${r}+`}</Text>
                  {r > 0 && <Ionicons name="star" size={12} color={ratingMin === r ? '#fff' : '#f59e0b'} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.sheetFooter}>
            <TouchableOpacity onPress={clearFilters} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnTxt, styles.btnGhostTxt]}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltersOpen(false)} style={[styles.btn, styles.btnPrimary]}>
              <Text style={[styles.btnTxt, styles.btnPrimaryTxt]}>Voir les produits</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  pinnedSafe: { backgroundColor: '#fff', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  pinnedHeader: { backgroundColor: '#fff', paddingTop: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  searchBar: {
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  searchInput: { color: '#111', fontSize: 15, marginLeft: 8, flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewBtn: { padding: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#f2f3f5',
  },
  actionBtnTxt: { color: '#111', fontWeight: '600' },
  dotBadge: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF7A00' },
  gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 8 },
  
  // Filter Panel
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    height: '60%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  sheetSection: { marginBottom: 24 },
  sheetLabel: { fontWeight: '700', marginBottom: 12, color: '#111', fontSize: 16 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#f2f3f5',
  },
  pillActive: { backgroundColor: '#111' },
  pillTxt: { color: '#111', fontWeight: '600' },
  pillTxtActive: { color: '#fff' },
  sheetFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    columnGap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontWeight: '800', fontSize: 16 },
  btnGhost: { backgroundColor: '#f2f3f5' },
  btnGhostTxt: { color: '#111' },
  btnPrimary: { backgroundColor: '#111' },
  btnPrimaryTxt: { color: '#fff' },
});

export default CatalogScreen;
