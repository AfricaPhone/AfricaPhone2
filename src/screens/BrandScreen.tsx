// src/screens/BrandScreen.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { useProducts } from '../store/ProductContext';
import { Product, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';
import { GridSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import { useAllProducts } from '../hooks/usePaginatedProducts';
import { formatPrice } from '../utils/formatPrice';

type BrandScreenRouteProp = RouteProp<RootStackParamList, 'Brand'>;

type ViewMode = 'grid' | 'list';
type SortOption = 'recommended' | 'priceAsc' | 'priceDesc';

const BRAND_STORIES: Record<
  string,
  {
    tagline: string;
    description: string;
    accentColor: string;
    backgroundColor: string;
    sellingPoints: string[];
  }
> = {
  tecno: {
    tagline: 'Innovation accessible',
    description: 'Tecno imagine des smartphones stylés, endurants et pensés pour les usages africains.',
    accentColor: '#2563eb',
    backgroundColor: '#dbeafe',
    sellingPoints: ['Interface HiOS optimisée', 'Service après-vente AfricaPhone', 'Livraison express'],
  },
  infinix: {
    tagline: 'Power & Style',
    description: 'Infinix combine performance et autonomie XXL pour les créateurs et gamers nomades.',
    accentColor: '#22c55e',
    backgroundColor: '#dcfce7',
    sellingPoints: ['Batteries longue durée', 'Écrans fluides 120 Hz', 'Accessoires gaming disponibles'],
  },
  redmi: {
    tagline: 'Performance MI',
    description: 'L’univers Redmi offre un rapport performances/prix imbattable sur le marché.',
    accentColor: '#f97316',
    backgroundColor: '#ffedd5',
    sellingPoints: ['MIUI optimisé', 'Modules photo 108-200 MP', 'Écosystème objets connectés'],
  },
  itel: {
    tagline: 'Toujours connecté',
    description: 'Itel démocratise des smartphones fiables, robustes et accessibles à tous.',
    accentColor: '#ef4444',
    backgroundColor: '#fee2e2',
    sellingPoints: ['Double SIM 4G', 'Garantie 12 mois', 'Stock permanent AfricaPhone'],
  },
  samsung: {
    tagline: 'Galaxy Experience',
    description: 'L’écosystème Galaxy associe innovation et services premium accompagnés par AfricaPhone.',
    accentColor: '#0f172a',
    backgroundColor: '#e2e8f0',
    sellingPoints: ['Écrans Super AMOLED', 'Garantie constructeur 12 mois', 'Synchronisation Galaxy / Windows'],
  },
};

const BrandScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<BrandScreenRouteProp>();
  const { brandId } = route.params;

  const { brands } = useProducts();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

  const heroProduct = filteredProducts[0];
  const listData = heroProduct ? filteredProducts.slice(1) : filteredProducts;

  const promoCount = useMemo(() => products.filter(item => item.enPromotion).length, [products]);
  const vedetteCount = useMemo(() => products.filter(item => item.isVedette).length, [products]);
  const averagePrice = useMemo(() => {
    if (products.length === 0) {
      return null;
    }
    const sum = products.reduce((acc, item) => acc + (item.price ?? 0), 0);
    return Math.round(sum / products.length);
  }, [products]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const props = {
        product: item,
        onPress: () => navigation.navigate('ProductDetail', { productId: item.id, product: item }),
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

  const Header = () => {
    const story =
      brand ? BRAND_STORIES[brand.id] ?? BRAND_STORIES[brand.name.toLowerCase()] : undefined;

    return (
      <View>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {brand?.logoUrl ? <Image source={{ uri: brand.logoUrl }} style={styles.brandLogo} /> : null}
            <Text style={styles.headerTitle}>{brand?.name ?? 'Marque'}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View
          style={[
            styles.storyCard,
            story
              ? { backgroundColor: story.backgroundColor, borderColor: story.accentColor }
              : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.storyTagline, { color: story?.accentColor ?? '#111827' }]}>
              {story?.tagline ?? 'Marque AfricaPhone'}
            </Text>
            <Text style={styles.storyDescription}>
              {story?.description ??
                "Découvrez les références phares de cette marque suivie par la communauté AfricaPhone. Livraison rapide et garanties locales incluses."}
            </Text>
            <View style={styles.statRow}>
              <StatBadge label="Produits" value={`${products.length}`} />
              <StatBadge label="Promotions" value={`${promoCount}`} />
              <StatBadge label="Vedettes" value={`${vedetteCount}`} />
              {averagePrice ? <StatBadge label="Prix moyen" value={formatPrice(averagePrice)} /> : null}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, { backgroundColor: story?.accentColor ?? '#111827' }]}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Text style={styles.followBtnText}>Suivre la marque</Text>
          </TouchableOpacity>
        </View>

        {story?.sellingPoints ? (
          <View style={styles.pointsContainer}>
            {story.sellingPoints.map(point => (
              <View key={point} style={styles.pointItem}>
                <Ionicons name="sparkles-outline" size={16} color={story.accentColor} />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.filterRow}>
          <ScrollChips
            viewMode={viewMode}
            onToggleView={setViewMode}
            sortOption={sortOption}
            onChangeSort={setSortOption}
            onlyPromotions={onlyPromotions}
            onTogglePromotions={() => setOnlyPromotions(prev => !prev)}
            onlyVedette={onlyVedette}
            onToggleVedette={() => setOnlyVedette(prev => !prev)}
          />
        </View>

        {heroProduct ? (
          <FeaturedProductCard
            product={heroProduct}
            onPress={() => navigation.navigate('ProductDetail', { productId: heroProduct.id, product: heroProduct })}
            accentColor={story?.accentColor}
          />
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      {loading ? (
        <View style={{ flex: 1, paddingTop: 10 }}>
          {viewMode === 'grid' ? (
            <View style={styles.gridContainer}>
              {Array.from({ length: 6 }).map((_, index) => (
                <GridSkeleton key={index} />
              ))}
            </View>
          ) : (
            Array.from({ length: 4 }).map((_, index) => <ListSkeleton key={index} />)
          )}
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={listData}
          key={viewMode}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 ? { flex: 1 } : undefined,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-handle-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>Aucun produit à afficher</Text>
              <Text style={styles.emptySubText}>
                Relancez les filtres ou revenez bientôt pour découvrir les nouvelles arrivées.
              </Text>
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
    color: '#111827',
  },
  storyCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
  },
  storyTagline: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  storyDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  followBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  filterRow: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  pointsContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptySubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

const statStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 90,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginTop: 4,
  },
});

const StatBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={statStyles.container}>
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
});

const ScrollChips: React.FC<{
  viewMode: ViewMode;
  onToggleView: (mode: ViewMode) => void;
  sortOption: SortOption;
  onChangeSort: (value: SortOption) => void;
  onlyPromotions: boolean;
  onTogglePromotions: () => void;
  onlyVedette: boolean;
  onToggleVedette: () => void;
}> = ({
  viewMode,
  onToggleView,
  sortOption,
  onChangeSort,
  onlyPromotions,
  onTogglePromotions,
  onlyVedette,
  onToggleVedette,
}) => {
  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[chipStyles.chip, active && chipStyles.chipActive]}
      activeOpacity={0.85}
    >
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={chipStyles.container}>
      <Chip label="Recommandés" active={sortOption === 'recommended'} onPress={() => onChangeSort('recommended')} />
      <Chip label="Prix croissant" active={sortOption === 'priceAsc'} onPress={() => onChangeSort('priceAsc')} />
      <Chip label="Prix décroissant" active={sortOption === 'priceDesc'} onPress={() => onChangeSort('priceDesc')} />
      <Chip label="Promotions" active={onlyPromotions} onPress={onTogglePromotions} />
      <Chip label="Vedettes" active={onlyVedette} onPress={onToggleVedette} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => onToggleView('grid')}
          style={[chipStyles.chip, viewMode === 'grid' && chipStyles.chipActive]}
          activeOpacity={0.85}
        >
          <Ionicons
            name="grid"
            size={16}
            color={viewMode === 'grid' ? '#fff' : '#111827'}
          />
          <Text style={[chipStyles.chipText, viewMode === 'grid' && chipStyles.chipTextActive]}>Grille</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleView('list')}
          style={[chipStyles.chip, viewMode === 'list' && chipStyles.chipActive]}
          activeOpacity={0.85}
        >
          <Ionicons
            name="list"
            size={16}
            color={viewMode === 'list' ? '#fff' : '#111827'}
          />
          <Text style={[chipStyles.chipText, viewMode === 'list' && chipStyles.chipTextActive]}>Liste</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const featuredStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  image: {
    width: '100%',
    height: 190,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const FeaturedProductCard: React.FC<{
  product: Product;
  onPress: () => void;
  accentColor?: string;
}> = ({ product, onPress, accentColor = '#111827' }) => (
  <TouchableOpacity style={featuredStyles.container} activeOpacity={0.9} onPress={onPress}>
    <Image source={{ uri: product.image }} style={featuredStyles.image} resizeMode="cover" />
    <View style={featuredStyles.content}>
      <Text style={[featuredStyles.label, { color: accentColor }]}>Sélection de la marque</Text>
      <Text style={featuredStyles.title}>{product.title}</Text>
      <Text style={featuredStyles.price}>
        {typeof product.price === 'number' ? formatPrice(product.price) : 'Prix à confirmer'}
      </Text>
      {product.highlight ? (
        <View style={featuredStyles.highlight}>
          <Ionicons name="flash-outline" size={16} color={accentColor} />
          <Text style={featuredStyles.highlightText}>{product.highlight}</Text>
        </View>
      ) : null}
      <View style={featuredStyles.footer}>
        <View style={featuredStyles.cta}>
          <Ionicons name="chevron-forward" size={18} color={accentColor} />
          <Text style={[featuredStyles.ctaText, { color: accentColor }]}>Voir la fiche</Text>
        </View>
        <Ionicons name="heart-outline" size={20} color="#9ca3af" />
      </View>
    </View>
  </TouchableOpacity>
);

export default BrandScreen;
