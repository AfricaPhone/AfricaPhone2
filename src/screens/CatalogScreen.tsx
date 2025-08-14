// src/screens/CatalogScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react'; // Ajout de useMemo
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
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { GridSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePaginatedProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';

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

  // --- State Management for Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [headerH, setHeaderH] = useState<number>(0);

  // --- Map UI state to Firestore query options ---
  const queryOptions = useMemo((): ProductQueryOptions => {
    const options: ProductQueryOptions = { category };
    if (debouncedQuery) {
        options.searchQuery = debouncedQuery;
    }
    switch (sort) {
      case 'priceAsc':
        options.sortBy = 'price';
        options.sortDirection = 'asc';
        break;
      case 'priceDesc':
        options.sortBy = 'price';
        options.sortDirection = 'desc';
        break;
      case 'ratingDesc':
        options.sortBy = 'rating';
        options.sortDirection = 'desc';
        break;
    }
    return options;
  }, [category, debouncedQuery, sort]);

  // --- Data Fetching using the custom hook ---
  const { products, loading, loadingMore, hasMore, loadMore, refresh } = usePaginatedProducts(queryOptions);

  useEffect(() => {
    refresh();
  }, [queryOptions, refresh]);

  // --- UI Helpers ---
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== headerH) setHeaderH(h);
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
                <Text style={styles.actionBtnTxt}>Trier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Product List */}
      {loading ? (
        <ListSkeletonComponent />
      ) : (
        <FlatList
          data={products}
          key={viewMode}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          contentContainerStyle={{ paddingTop: headerH, paddingBottom: 20 }}
          onEndReached={() => hasMore && !loadingMore && loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#FF7A00" style={{ marginVertical: 20 }}/> : null}
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
            <Text style={styles.sheetTitle}>Trier par</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}>
              <Ionicons name="close-circle" size={26} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetSection}>
            <View style={styles.pillsRow}>
              {(['relevance', 'priceAsc', 'priceDesc', 'ratingDesc'] as SortKey[]).map(s => (
                <TouchableOpacity key={s} onPress={() => { setSort(s); setFiltersOpen(false); }} style={[styles.pill, sort === s && styles.pillActive]}>
                  <Text style={[styles.pillTxt, sort === s && styles.pillTxtActive]}>
                    {s === 'relevance' ? 'Pertinence' : s === 'priceAsc' ? 'Prix ↑' : s === 'priceDesc' ? 'Prix ↓' : 'Mieux notés'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    paddingBottom: 24,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  sheetSection: { marginBottom: 24 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#f2f3f5',
  },
  pillActive: { backgroundColor: '#111' },
  pillTxt: { color: '#111', fontWeight: '600' },
  pillTxtActive: { color: '#fff' },
});

export default CatalogScreen;
