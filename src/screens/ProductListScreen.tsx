// src/screens/ProductListScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePaginatedProducts, ProductQueryOptions } from '../hooks/usePaginatedProducts';

type RouteParams = { 
  title: string;
  category?: string;
  brandId?: string;
  searchQuery?: string;
};

type ViewMode = 'grid' | 'list';

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { title, category, brandId, searchQuery } = route.params as RouteParams;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const queryOptions = useMemo((): ProductQueryOptions => ({
    category,
    brandId,
    searchQuery,
  }), [category, brandId, searchQuery]);

  const { products, loading, loadingMore, hasMore, loadMore, refresh } = usePaginatedProducts(queryOptions);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.actionsRow}>
        <Text style={styles.productCount}>{products.length} produits</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViewMode('grid')} style={styles.viewBtn}>
            <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#111' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.viewBtn}>
            <Ionicons name="list" size={22} color={viewMode === 'list' ? '#111' : '#999'} />
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
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          onEndReached={() => hasMore && !loadingMore && loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#FF7A00" style={{ marginVertical: 20 }}/> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit trouvé.</Text>
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productCount: { color: '#6b7280', fontWeight: '600' },
  viewBtn: { padding: 4 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
});

export default ProductListScreen;
