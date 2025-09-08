// src/screens/FilterScreenResults.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product, FilterOptions as FilterOptionsType } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useAllProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';
import { RootStackParamList } from '../types';
import FilterModal from './home/FilterBottomSheet';

type FilterScreenRouteProp = RouteProp<RootStackParamList, 'FilterScreenResults'>;
type ViewMode = 'grid' | 'list';
type SortOption = 'nameAsc' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'nameAsc', label: 'Pertinence' },
  { key: 'priceAsc', label: 'Prix croissant' },
  { key: 'priceDesc', label: 'Prix décroissant' },
];

const FilterScreenResults: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<FilterScreenRouteProp>();

  const [filters, setFilters] = useState<FilterOptionsType>(route.params || {});
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('nameAsc');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const queryOptions = useMemo((): ProductQueryOptions => {
    const [sortField, sortDirection] = sortBy.split(/(?=[A-Z])/);

    return {
      ...filters,
      sortBy: sortField.toLowerCase() as 'name' | 'price',
      sortDirection: (sortDirection || 'asc').toLowerCase() as 'asc' | 'desc',
    };
  }, [filters, sortBy]);

  const { products, loading, refresh } = useAllProducts(queryOptions);

  useEffect(() => {
    refresh();
  }, [queryOptions, refresh]);

  const handleApplyFilters = (newFilters: FilterOptionsType) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const props = {
        product: item,
        onPress: () => navigation.navigate('ProductDetail', { productId: item.id }),
      };
      if (viewMode === 'grid') {
        return (
          <View style={styles.gridItem}>
            <ProductGridCard {...props} />
          </View>
        );
      }
      return (
        <View style={styles.listItem}>
          <ProductListItem {...props} />
        </View>
      );
    },
    [viewMode, navigation]
  );

  const renderActiveFilters = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => !!value && key !== 'initialSearchQuery');
    if (activeFilters.length === 0) return null;

    return (
      <View style={styles.pillsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {filters.minPrice && <Text style={styles.pill}>{`Min: ${filters.minPrice} FCFA`}</Text>}
          {filters.maxPrice && <Text style={styles.pill}>{`Max: ${filters.maxPrice} FCFA`}</Text>}
          {filters.enPromotion && <Text style={styles.pill}>En Promotion</Text>}
          {filters.isVedette && <Text style={styles.pill}>Produits Vedettes</Text>}
          {filters.brands?.map(brand => (
            <Text key={brand.id} style={styles.pill}>
              {brand.name}
            </Text>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultats ({products.length})</Text>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
          <Ionicons name="filter-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      {/* PANNEAU DE CONTRÔLE UNIFIÉ */}
      <View style={styles.controlsContainer}>
        {renderActiveFilters()}
        <View style={styles.sortBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContainer}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortButton, sortBy === opt.key && styles.sortButtonActive]}
                onPress={() => setSortBy(opt.key)}
              >
                <Text style={[styles.sortText, sortBy === opt.key && styles.sortTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))}
          >
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF7A00" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={products}
          key={viewMode}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit ne correspond à ces filtres.</Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  filterButton: { padding: 8, borderRadius: 12 },

  // NOUVELLE SECTION POUR LES CONTRÔLES
  controlsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pillsScroll: {
    paddingBottom: 10,
    gap: 8,
  },
  pill: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 13,
    fontWeight: '500',
    overflow: 'hidden',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 8,
  },
  sortContainer: { gap: 10, alignItems: 'center' },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  sortButtonActive: { backgroundColor: '#FF7A00' },
  sortText: { color: '#4b5563', fontWeight: '600' },
  sortTextActive: { color: '#fff' },
  viewModeButton: { padding: 6 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
  gridItem: { width: '48%' },
  listItem: { paddingHorizontal: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
});

export default FilterScreenResults;
