// src/screens/home/ProductGrid.tsx
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollCoordinatorProvider, useScrollCoordinator } from '../../contexts/ScrollCoordinator';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Product, RootStackParamList } from '../../types';
import ProductGridCard from '../../components/ProductGridCard';
import { GridSkeleton } from '../../components/SkeletonLoader';

interface Props {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  listHeaderComponent: React.ReactElement | null;
  error?: string | null;
  onRetry?: () => void;
}

const ProductGridInner: React.FC<Props> = ({
  products,
  loading,
  loadingMore,
  onLoadMore,
  onRefresh,
  refreshing,
  listHeaderComponent,
  hasMore,
  error,
  onRetry,
}) => {
  const { parentScrollEnabled } = useScrollCoordinator();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.gridItem}>
        <ProductGridCard
          product={item}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
        />
      </View>
    ),
    [navigation]
  );

  const headerNode = useMemo(() => {
    if (!error && !listHeaderComponent) {
      return null;
    }

    return (
      <View>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#991b1b" />
            <Text style={styles.errorText}>{error}</Text>
            {onRetry ? (
              <TouchableOpacity style={styles.errorButton} onPress={onRetry} activeOpacity={0.85}>
                <Text style={styles.errorButtonText}>Réessayer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {listHeaderComponent}
      </View>
    );
  }, [error, listHeaderComponent, onRetry]);

  if (loading && products.length === 0) {
    const skeletons = Array.from({ length: 6 });
    return (
      <ScrollView scrollEnabled={parentScrollEnabled} directionalLockEnabled nestedScrollEnabled>
        {headerNode}
        <View style={styles.gridContainer}>
          {skeletons.map((_, index) => (
            <View key={index} style={styles.gridItem}>
              <GridSkeleton />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" />;
  };

  return (
    <FlatList
      scrollEnabled={parentScrollEnabled}
      directionalLockEnabled
      nestedScrollEnabled
      data={products}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      numColumns={2}
      ListHeaderComponent={headerNode}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      columnWrapperStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7A00" />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={28} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>Aucun produit pour le moment</Text>
          <Text style={styles.emptyText}>Revenez plus tard ou explorez d’autres catégories.</Text>
          {onRetry ? (
            <TouchableOpacity style={styles.emptyButton} onPress={onRetry} activeOpacity={0.85}>
              <Text style={styles.emptyButtonText}>Actualiser</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 12,
    paddingBottom: 48,
  },
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    columnGap: 12,
  },
  gridItem: {
    width: '48%',
    marginBottom: 18,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
  errorButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  errorButtonText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
});

const ProductGrid: React.FC<Props> = props => (
  <ScrollCoordinatorProvider>
    <ProductGridInner {...props} />
  </ScrollCoordinatorProvider>
);

export default ProductGrid;
