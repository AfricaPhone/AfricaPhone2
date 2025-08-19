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
  ScrollView, // Added for filter options scroll
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAllProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';
import PriceRangeSlider from '../components/PriceRangeSlider'; // Import the new slider component

type RouteParams = {
  initialCategory?: Category;
  initialSearchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  ram?: number;
  rom?: number;
};

type SortKey = 'priceAsc' | 'priceDesc';
type ViewMode = 'grid' | 'list';

const { width } = Dimensions.get('window');

// Common RAM/ROM options for chips
const RAM_OPTIONS = [2, 4, 6, 8, 12, 16]; // Added 16GB RAM option
const ROM_OPTIONS = [32, 64, 128, 256, 512, 1024]; // Added 1024GB (1TB) ROM option

const FilterScreenResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { 
    initialCategory, 
    initialSearchQuery, 
    minPrice: initialMinPrice, 
    maxPrice: initialMaxPrice,
    ram: initialRam,
    rom: initialRom,
  } = route.params as RouteParams || {};

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [sort, setSort] = useState<SortKey>('priceAsc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // State for the price range slider
  const [minPrice, setMinPrice] = useState(Number(initialMinPrice) || 0);
  const [maxPrice, setMaxPrice] = useState(Number(initialMaxPrice) || 1000000);

  // State for RAM/ROM filters
  const [selectedRam, setSelectedRam] = useState<number | null>(initialRam || null);
  const [selectedRom, setSelectedRom] = useState<number | null>(initialRom || null);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryOptions = useMemo((): ProductQueryOptions => {
    const options: ProductQueryOptions = { 
      category, 
      minPrice: String(minPrice), 
      maxPrice: String(maxPrice), 
      searchQuery 
    };
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
    // Add RAM/ROM to query options if selected
    if (selectedRam !== null) {
      options.ram = selectedRam;
    }
    if (selectedRom !== null) {
      options.rom = selectedRom;
    }
    return options;
  }, [category, searchQuery, sort, minPrice, maxPrice, selectedRam, selectedRom]);

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
    setMinPrice(0);
    setMaxPrice(1000000); // Reset to full range
    setSort('priceAsc');
    setSearchQuery('');
    setCategory(undefined);
    setSelectedRam(null);
    setSelectedRom(null);
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

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetSection}>
                <Text style={styles.filterSectionTitle}>Prix</Text>
                <PriceRangeSlider
                  min={0}
                  max={1000000} // Example max price, adjust as needed
                  initialMinValue={minPrice}
                  initialMaxValue={maxPrice}
                  onChange={(min, max) => {
                    setMinPrice(min);
                    setMaxPrice(max);
                  }}
                />
            </View>

            <View style={styles.sheetSection}>
                <Text style={styles.filterSectionTitle}>RAM (Go)</Text>
                <View style={styles.pillsRow}>
                    {RAM_OPTIONS.map(ram => (
                        <TouchableOpacity 
                            key={`ram-${ram}`} 
                            onPress={() => setSelectedRam(selectedRam === ram ? null : ram)} 
                            style={[styles.pill, selectedRam === ram && styles.pillActive]}
                        >
                            <Text style={[styles.pillTxt, selectedRam === ram && styles.pillTxtActive]}>
                                {ram}Go
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.sheetSection}>
                <Text style={styles.filterSectionTitle}>ROM (Go)</Text>
                <View style={styles.pillsRow}>
                    {ROM_OPTIONS.map(rom => (
                        <TouchableOpacity 
                            key={`rom-${rom}`} 
                            onPress={() => setSelectedRom(selectedRom === rom ? null : rom)} 
                            style={[styles.pill, selectedRom === rom && styles.pillActive]}
                        >
                            <Text style={[styles.pillTxt, selectedRom === rom && styles.pillTxtActive]}>
                                {rom}Go
                            </Text>
                        </TouchableOpacity>
                    ))}
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
          </ScrollView>

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
    maxHeight: '80%', // Limit height for scrollability
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
  
  // Filter Panel (Prix) - Removed priceInputsRow, priceInputWrap, priceInput, priceUnit styles
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
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