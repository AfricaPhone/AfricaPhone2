// src/screens/BrandScreen.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { useProducts } from '../store/ProductContext';
import { Product, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import { GridSkeleton } from '../components/SkeletonLoader';
import { useAllProducts } from '../hooks/usePaginatedProducts';

type BrandScreenRouteProp = RouteProp<RootStackParamList, 'Brand'>;

type SortOption = 'recommended' | 'priceAsc' | 'priceDesc';

const BrandScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<BrandScreenRouteProp>();
  const { brandId } = route.params;

  const { brands } = useProducts();
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [onlyPromotions, setOnlyPromotions] = useState(false);
  const [onlyVedette, setOnlyVedette] = useState(false);

  const brand = useMemo(() => brands.find(b => b.id === brandId), [brands, brandId]);
  const brandFilterValue = useMemo(() => brand?.name ?? brandId, [brand?.name, brandId]);

  const { products, loading, refresh } = useAllProducts({ brandId: brandFilterValue });

  useEffect(() => {
    refresh();
  }, [refresh, brandFilterValue]);

  const filteredProducts = useMemo(() => {
    let list = products;

    if (onlyPromotions) {
      list = list.filter(product => product.enPromotion);
    }

    if (onlyVedette) {
      list = list.filter(product => product.isVedette);
    }

    const sorted = [...list];
    if (sortOption === 'priceAsc') {
      sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortOption === 'priceDesc') {
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else {
      sorted.sort((a, b) => {
        if (a.isVedette === b.isVedette) {
          return (b.ordreVedette ?? 0) - (a.ordreVedette ?? 0);
        }
        return a.isVedette ? -1 : 1;
      });
    }

    return sorted;
  }, [products, onlyPromotions, onlyVedette, sortOption]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.gridItem}>
        <ProductGridCard
          product={item}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        />
      </View>
    ),
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.topBarContent}>
          {brand?.logoUrl ? <Image source={{ uri: brand.logoUrl }} style={styles.brandLogo} /> : null}
          <Text style={styles.brandName}>{brand?.name ?? 'Marque'}</Text>
        </View>
        <View style={styles.topBarPlaceholder} />
      </View>

      <View style={styles.filtersContainer}>
        <FilterChip
          label="Recommandés"
          active={sortOption === 'recommended'}
          onPress={() => setSortOption('recommended')}
        />
        <FilterChip
          label="Prix croissant"
          active={sortOption === 'priceAsc'}
          onPress={() => setSortOption('priceAsc')}
        />
        <FilterChip
          label="Prix décroissant"
          active={sortOption === 'priceDesc'}
          onPress={() => setSortOption('priceDesc')}
        />
        <FilterChip label="Promotions" active={onlyPromotions} onPress={() => setOnlyPromotions(v => !v)} />
        <FilterChip label="Vedettes" active={onlyVedette} onPress={() => setOnlyVedette(v => !v)} />
      </View>

      {loading ? (
        <View style={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.gridItem}>
              <GridSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredProducts.length === 0 ? styles.listContentEmpty : undefined,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-handle-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Aucun produit à afficher</Text>
              <Text style={styles.emptySubtitle}>
                Ajustez les filtres ou revenez bientôt pour découvrir les nouvelles arrivées.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const FilterChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
    activeOpacity={0.85}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarPlaceholder: {
    width: 32,
  },
  brandLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    fontWeight: '600',
    color: '#111827',
  },
  chipTextActive: {
    color: '#fff',
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridItem: {
    width: '48%',
  },
  loadingGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BrandScreen;
