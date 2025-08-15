// src/screens/FilterScreenResults.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Keyboard,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAllProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';

type RouteParams = {
  initialCategory?: Category;
  initialSearchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
};

type SortKey = 'priceAsc' | 'priceDesc';
type ViewMode = 'grid' | 'list';

const { width } = Dimensions.get('window');

const FilterScreenResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { initialCategory, initialSearchQuery, minPrice: initialMinPrice, maxPrice: initialMaxPrice } = route.params as RouteParams || {};

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [sort, setSort] = useState<SortKey>('priceAsc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [minPrice, setMinPrice] = useState(initialMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice || '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryOptions = useMemo((): ProductQueryOptions => {
    const options: ProductQueryOptions = { category, minPrice, maxPrice, searchQuery };
    switch (sort) {
      case 'priceAsc':
        options.sortBy = 'price';
        options.sortDirection = 'asc';
        break;
      case 'priceDesc':
        options.sortBy = 'price';
        options.sortDirection = 'desc';
        break;
    }
    return options;
  }, [category, searchQuery, sort, minPrice, maxPrice]);

  const { products, loading, refresh } = useAllProducts(queryOptions);

  useEffect(() => {
    refresh();
  }, [queryOptions, refresh]);

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

  const handleApplyFilter = () => {
    setFiltersOpen(false);
    refresh();
  };

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSort('priceAsc');
    setSearchQuery('');
    setCategory(undefined);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Résultats ({products.length})</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.filterButton}>
                <MaterialCommunityIcons name="filter-variant" size={20} color="#111" />
            </TouchableOpacity>
        </View>

        {loading ? (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF7A00" />
            </View>
        ) : (
            <FlatList
                style={{ flex: 1 }}
                data={products}
                key={viewMode}
                keyExtractor={(item) => item.id}
                numColumns={viewMode === 'grid' ? 2 : 1}
                columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => Keyboard.dismiss()}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Aucun produit ne correspond à ces filtres.</Text>
                        <Text style={styles.emptySubText}>Essayez de modifier votre sélection.</Text>
                    </View>
                }
            />
        )}
      <Modal visible={filtersOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}>
              <Ionicons name="close-circle" size={26} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetSection}>
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

          <View style={styles.sheetSection}>
            <Text style={styles.filterSectionTitle}>Trier par</Text>
            <View style={styles.pillsRow}>
              {(['priceAsc', 'priceDesc'] as SortKey[]).map(s => (
                <TouchableOpacity key={s} onPress={() => { setSort(s); }} style={[styles.pill, sort === s && styles.pillActive]}>
                  <Text style={[styles.pillTxt, sort === s && styles.pillTxtActive]}>
                    {s === 'priceAsc' ? 'Prix ↑' : 'Prix ↓'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={handleApplyFilter} style={styles.showButton}>
            <Text style={styles.showButtonText}>Voir les résultats</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  filterButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f2f3f5',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },
  
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
  
  // Filter Panel (Prix)
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

export default FilterScreenResults;
