// src/screens/BrandScreen.tsx
import React, { useMemo, useState, useCallback } from 'react';
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
import { useProducts } from '../store/ProductContext'; // Importer useProducts
import { Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { GridSkeleton, ListSkeleton } from '../components/SkeletonLoader';

type RouteParams = {
  brandId: string;
};

type ViewMode = 'grid' | 'list';

const ITEM_HEIGHT = 120;
const ITEM_SEPARATOR_HEIGHT = 12;
const TOTAL_ITEM_SIZE = ITEM_HEIGHT + ITEM_SEPARATOR_HEIGHT;

const BrandScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { brandId } = route.params as RouteParams;

  const { products, productsLoading, brands } = useProducts(); // Utiliser useProducts
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const brand = useMemo(() => brands.find(b => b.id === brandId), [brands, brandId]);

  const brandProducts = useMemo(() => {
    if (!brand) return [];
    return products.filter(p => p.category.toLowerCase() === brand.id.toLowerCase());
  }, [products, brand]);

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
  
  const getItemLayout = (data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: TOTAL_ITEM_SIZE * index,
    index,
  });

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
        <Text style={styles.productCount}>{brandProducts.length} produits</Text>
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
          data={brandProducts}
          key={viewMode}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: ITEM_SEPARATOR_HEIGHT }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          getItemLayout={viewMode === 'list' ? getItemLayout : undefined}
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
