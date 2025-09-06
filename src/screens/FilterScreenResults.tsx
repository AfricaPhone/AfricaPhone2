// src/screens/FilterScreenResults.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAllProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';

// --- Définitions copiées depuis FilterBottomSheet.tsx ---
const PRICE_RANGES = [
  { label: 'Moins de 50k', min: 0, max: 49999 },
  { label: '50k - 100k', min: 50000, max: 99999 },
  { label: '100k - 200k', min: 100000, max: 199999 },
  { label: 'Plus de 200k', min: 200000, max: 9999999 },
];
type PriceRange = (typeof PRICE_RANGES)[0] | null;

const CAPACITY_OPTIONS = [
  { label: '32GB + 4GB', rom: 32, ram: 4 },
  { label: '64GB + 4GB', rom: 64, ram: 4 },
  { label: '64GB + 3GB', rom: 64, ram: 3 },
  { label: '128GB + 8GB', rom: 128, ram: 8 },
  { label: '256GB + 16GB', rom: 256, ram: 16 },
  { label: '512GB + 24GB', rom: 512, ram: 24 },
];
export type Capacity = (typeof CAPACITY_OPTIONS)[0] | null;
// --- Fin des définitions copiées ---

type RouteParams = {
  initialCategory?: Category;
  initialSearchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  rom?: number;
  ram?: number;
};

type ViewMode = 'grid' | 'list';

const FilterScreenResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const {
    initialCategory,
    initialSearchQuery,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    rom: initialRom,
    ram: initialRam,
  } = (route.params as RouteParams) || {};

  // États pour les filtres actuellement appliqués
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [minPrice, setMinPrice] = useState(initialMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice || '');
  const [rom, setRom] = useState(initialRom);
  const [ram, setRam] = useState(initialRam);

  // États temporaires pour la modale
  const [tempSelectedPriceRange, setTempSelectedPriceRange] = useState<PriceRange>(() => {
    if (initialMinPrice && initialMaxPrice) {
      return PRICE_RANGES.find(r => r.min === Number(initialMinPrice) && r.max === Number(initialMaxPrice)) || null;
    }
    return null;
  });

  const [tempSelectedCapacity, setTempSelectedCapacity] = useState<Capacity>(() => {
    if (initialRom && initialRam) {
      return CAPACITY_OPTIONS.find(c => c.rom === initialRom && c.ram === initialRam) || null;
    }
    return null;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryOptions = useMemo((): ProductQueryOptions => {
    return {
      category,
      minPrice,
      maxPrice,
      searchQuery,
      rom,
      ram,
      sortBy: 'price',
      sortDirection: 'asc',
    };
  }, [category, searchQuery, minPrice, maxPrice, rom, ram]);

  const { products, loading, refresh } = useAllProducts(queryOptions);

  useEffect(() => {
    refresh();
  }, [queryOptions, refresh]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const props = {
        product: item,
        onPress: () => navigation.navigate('ProductDetail', { productId: item.id }),
      };
      if (viewMode === 'grid') {
        return (
          <View style={{ width: '48%' }}>
            <ProductGridCard {...props} />
          </View>
        );
      }
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <ProductListItem {...props} />
        </View>
      );
    },
    [viewMode, navigation]
  );

  const handleApplyFilter = () => {
    setMinPrice(tempSelectedPriceRange ? String(tempSelectedPriceRange.min) : '');
    setMaxPrice(tempSelectedPriceRange ? String(tempSelectedPriceRange.max) : '');
    setRom(tempSelectedCapacity?.rom);
    setRam(tempSelectedCapacity?.ram);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    // Réinitialise les états temporaires
    setTempSelectedPriceRange(null);
    setTempSelectedCapacity(null);
    // Applique immédiatement la réinitialisation
    setMinPrice('');
    setMaxPrice('');
    setRom(undefined);
    setRam(undefined);
    setFiltersOpen(false);
  };

  const openFilterModal = () => {
    // Synchronise les filtres temporaires avec les filtres actuels
    setTempSelectedPriceRange(
      minPrice && maxPrice ? PRICE_RANGES.find(r => r.min === Number(minPrice) && r.max === Number(maxPrice)) || null : null
    );
    setTempSelectedCapacity(
      rom && ram ? CAPACITY_OPTIONS.find(c => c.rom === rom && c.ram === ram) || null : null
    );
    setFiltersOpen(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultats ({products.length})</Text>
        <TouchableOpacity onPress={openFilterModal} style={styles.filterButton}>
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
          keyExtractor={item => item.id}
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
              <TouchableOpacity style={styles.emptyButton} onPress={openFilterModal}>
                <Text style={styles.emptyButtonText}>Essayer un autre filtre</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <Modal visible={filtersOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <ScrollView>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)}>
                <Ionicons name="close-circle" size={26} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* --- SECTION FOURCHETTE DE PRIX --- */}
            <View style={styles.sheetSection}>
              <Text style={styles.filterSectionTitle}>Fourchette de prix (FCFA)</Text>
              <View style={styles.pillsRow}>
                {PRICE_RANGES.map(range => {
                  const isActive = tempSelectedPriceRange?.label === range.label;
                  return (
                    <TouchableOpacity
                      key={range.label}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setTempSelectedPriceRange(range)}
                    >
                      <Text style={[styles.pillTxt, isActive && styles.pillTxtActive]}>{range.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* --- SECTION CAPACITÉ --- */}
            <View style={styles.sheetSection}>
              <Text style={styles.filterSectionTitle}>Capacité (Stockage + RAM)</Text>
              <View style={styles.pillsRow}>
                {CAPACITY_OPTIONS.map(capacity => {
                  const isActive = tempSelectedCapacity?.label === capacity.label;
                  return (
                    <TouchableOpacity
                      key={capacity.label}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setTempSelectedCapacity(capacity)}
                    >
                      <Text style={[styles.pillTxt, isActive && styles.pillTxtActive]}>{capacity.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity onPress={handleApplyFilter} style={styles.showButton}>
              <Text style={styles.showButtonText}>Voir les résultats</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
          </ScrollView>
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Filter Panel
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%', // Limite la hauteur
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  sheetSection: { marginBottom: 24 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#f2f3f5',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillTxt: { color: '#111', fontWeight: '600', fontSize: 14 },
  pillTxtActive: { color: '#fff' },

  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
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