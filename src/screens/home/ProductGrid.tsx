// src/screens/home/ProductGrid.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../../types';
import ProductGridCard from '../../components/ProductGridCard';
import { GridSkeleton } from '../../components/SkeletonLoader';

// Création du composant animé à partir de FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface Props {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  listHeaderComponent: React.ReactElement;
  activeSegment: string;
  onScroll: (...args: any[]) => void;
  scrollEventThrottle: number;
}

const ProductGrid: React.FC<Props> = ({
  products,
  loading,
  loadingMore,
  onLoadMore,
  onRefresh,
  refreshing,
  listHeaderComponent,
  activeSegment,
  onScroll,
  scrollEventThrottle,
}) => {
  const navigation = useNavigation<any>();

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.gridItem}>
        <ProductGridCard product={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
      </View>
    ),
    [navigation]
  );

  if (loading && !refreshing) {
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7A00" />}>
        {listHeaderComponent}
        <View style={styles.gridContainer}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.gridItem}>
              <GridSkeleton />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <AnimatedFlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={item => `${activeSegment}-${item.id}`}
      numColumns={2}
      ListHeaderComponent={listHeaderComponent}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      columnWrapperStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7A00" />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          {!loading && <Text style={styles.emptyText}>Aucun produit dans cette catégorie.</Text>}
        </View>
      }
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});

export default ProductGrid;
