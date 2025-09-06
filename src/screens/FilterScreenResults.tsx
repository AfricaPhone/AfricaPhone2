// src/screens/FilterScreenResults.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
// CORRECTION: Chemin d'importation mis à jour
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAllProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';
import { RootStackParamList } from '../types';

type FilterScreenRouteProp = RouteProp<RootStackParamList, 'FilterScreenResults'>;
type ViewMode = 'grid' | 'list';
type SortOption = 'nameAsc' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'nameAsc', label: 'Pertinence' },
  { key: 'priceAsc', label: 'Prix croissant' },
  { key: 'priceDesc', label: 'Prix décroissant' },
];

const FilterScreenResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<FilterScreenRouteProp>();
  const initialFilters = route.params || {};

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('nameAsc');

  const queryOptions = useMemo((): ProductQueryOptions => {
    const [sortField, sortDirection] = sortBy.split(/(?=[A-Z])/);
    
    return {
      ...initialFilters,
      sortBy: sortField.toLowerCase() as 'name' | 'price',
      sortDirection: (sortDirection || 'asc').toLowerCase() as 'asc' | 'desc',
    };
  }, [initialFilters, sortBy]);
  
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
  
  const renderActiveFilters = () => {
      const filters = Object.entries(initialFilters).filter(([key]) => key !== 'initialSearchQuery' && initialFilters[key as keyof typeof initialFilters]);
      if (filters.length === 0) return null;

      return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
              {initialFilters.minPrice && <Text style={styles.pill}>{`Min: ${initialFilters.minPrice} FCFA`}</Text>}
              {initialFilters.maxPrice && <Text style={styles.pill}>{`Max: ${initialFilters.maxPrice} FCFA`}</Text>}
              {initialFilters.enPromotion && <Text style={styles.pill}>En Promotion</Text>}
              {initialFilters.isVedette && <Text style={styles.pill}>Produits Vedettes</Text>}
          </ScrollView>
      )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultats ({products.length})</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#111" />
        </TouchableOpacity>
      </View>
      
      {renderActiveFilters()}

      <View style={styles.controlsHeader}>
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
        <View style={styles.viewModeContainer}>
            <TouchableOpacity onPress={() => setViewMode('grid')}>
                <Ionicons name={viewMode === 'grid' ? 'grid' : 'grid-outline'} size={22} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('list')}>
                <Ionicons name={viewMode === 'list' ? 'list' : 'list-outline'} size={26} color="#111" />
            </TouchableOpacity>
        </View>
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
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit ne correspond à ces filtres.</Text>
            </View>
          }
        />
      )}
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
    filterButton: { padding: 6, borderRadius: 12, backgroundColor: '#f2f3f5' },
    pillsContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
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
    controlsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sortContainer: { gap: 8, alignItems: 'center' },
    sortButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    sortButtonActive: { backgroundColor: '#feeedd'},
    sortText: { color: '#4b5563', fontWeight: '600' },
    sortTextActive: { color: '#FF7A00' },
    viewModeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 20 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
});

export default FilterScreenResults;