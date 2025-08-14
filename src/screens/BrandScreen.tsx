// src/screens/BrandScreen.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProducts } from '../store/ProductContext';
import { Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { GridSkeleton, ListSkeleton } from '../components/SkeletonLoader';

type RouteParams = {
  brandId: string;
};

type ViewMode = 'grid' | 'list';
const PAGE_SIZE = 10;

const BrandScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { brandId } = route.params as RouteParams;

  const { products, productsLoading, brands } = useProducts();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // --- Pagination State ---
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const brand = useMemo(() => brands.find(b => b.id === brandId), [brands, brandId]);

  const sourceProducts = useMemo(() => {
    if (!brand) return [];
    return products.filter(p => p.category.toLowerCase() === brand.id.toLowerCase());
  }, [products, brand]);
  
  // --- Effect to reset pagination when source changes ---
  useEffect(() => {
    if (sourceProducts.length > 0) {
      const firstPage = sourceProducts.slice(0, PAGE_SIZE);
      setDisplayedProducts(firstPage);
      setCurrentPage(1);
      setHasMore(firstPage.length < sourceProducts.length);
    } else {
        setDisplayedProducts([]);
    }
  }, [sourceProducts]);
  
  // --- Load More Function ---
  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const newProducts = sourceProducts.slice(0, nextPage * PAGE_SIZE);
      
      setDisplayedProducts(newProducts);
      setCurrentPage(nextPage);
      setHasMore(newProducts.length < sourceProducts.length);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, hasMore, currentPage, sourceProducts]);

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

  const Header = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {brand?.logoUrl && <Image source={{ uri: brand.logoUrl }} style={styles.brandLogo} />}
          <Text style={styles.headerTitle}>{brand?.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.actionsRow}>
        <Text style={styles.productCount}>{sourceProducts.length} produits</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViewMode('grid')} style={styles.viewBtn}>
            <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#111' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.viewBtn}>
            <Ionicons name="list" size={22} color={viewMode === 'list' ? '#111' : '#999'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      {productsLoading ? (
        <View style={{ flex: 1, paddingTop: 10 }}>
          {viewMode === 'grid' ? (
            <View style={styles.gridContainer}>
              {Array.from({ length: 6 }).map((_, i) => <GridSkeleton key={i} />)}
            </View>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <ListSkeleton key={i} />)
          )}
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          key={viewMode}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#FF7A00" style={{ marginVertical: 20 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit trouvé</Text>
              <Text style={styles.emptySubText}>Cette marque n'a pas encore de produits disponibles.</Text>
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
  backButton: {
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productCount: {
    color: '#6b7280',
    fontWeight: '600',
  },
  viewBtn: {
    padding: 4,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default BrandScreen;
