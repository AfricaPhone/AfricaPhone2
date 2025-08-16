// src/screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, ImageBackground, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import CustomBottomSheet from '../components/CustomBottomSheet';
import { Product, Brand, RootStackParamList } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import { useProducts } from '../store/ProductContext';
import { db } from '../firebase/config';

type Nav = ReturnType<typeof useNavigation<any>>;

// --- Constantes ---
const { width: screenWidth } = Dimensions.get('window');
const PAGE_SIZE = 10;
const SEGMENTS = ['Populaires', 'Tablettes', 'Acessoires', 'Portables a Touches'] as const;
type Segment = typeof SEGMENTS[number];

// MODIFICATION: Ajout d'icônes et de labels pour les segments
const SEGMENTS_DATA: Array<{
  key: Segment;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'Populaires', label: 'Populaires', icon: 'star-outline' },
  { key: 'Tablettes', label: 'Tablettes', icon: 'tablet-portrait-outline' },
  { key: 'Acessoires', label: 'Accessoires', icon: 'headset-outline' },
  { key: 'Portables a Touches', label: 'Classiques', icon: 'keypad-outline' },
];

const HORIZONTAL_CARDS: Array<{
  id: string;
  title: string;
  subtitle?: string;
  cta: string;
  image: string;
  screen?: keyof RootStackParamList
}> = [
    {
        id: 'f-wheel',
        title: 'Jeu pronostique',
        cta: 'Jouer maintenant',
        screen: 'MatchList',
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'p-store',
      title: "Notre boutique",
      subtitle: "Situé près de l'Etoile Rouge",
      cta: "Découvrir",
      screen: 'Store',
      image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop',
    },
];


// --- Helpers ---
const mapDocToProduct = (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: data.imageUrl,
    category: data.brand?.toLowerCase() || 'inconnu',
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
    ordreVedette: data.ordreVedette,
  };
};

interface SegmentData {
  products: Product[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

// --- Écran principal HomeScreen ---
const HomeScreen: React.FC = () => {
  const nav: Nav = useNavigation<any>();
  const { brands, brandsLoading } = useProducts();
  const [activeSegment, setActiveSegment] = useState<Segment>('Populaires');

  // États séparés pour la logique complexe des "Populaires"
  const [vedetteProducts, setVedetteProducts] = useState<Product[]>([]);
  const [regularProducts, setRegularProducts] = useState<SegmentData>({ products: [], lastDoc: null, hasMore: true });

  const [dataBySegment, setDataBySegment] = useState<Partial<Record<Segment, SegmentData>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Filtres temporaires pour le modal
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = useCallback(async (
    segment: Segment,
    isRefresh = false,
  ) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    try {
      if (segment === 'Populaires') {
        // --- Logique spéciale pour l'onglet "Populaires" ---
        // 1. Récupérer les 6 produits vedettes
        const vedetteQuery = query(
          collection(db, 'products'),
          where('ordreVedette', '>=', 1),
          where('ordreVedette', '<=', 6),
          orderBy('ordreVedette', 'asc')
        );
        const vedetteSnapshot = await getDocs(vedetteQuery);
        const fetchedVedette = vedetteSnapshot.docs.map(mapDocToProduct);
        setVedetteProducts(fetchedVedette);

        // 2. Récupérer la première page des autres produits
        const regularQuery = query(
          collection(db, 'products'),
          where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
          orderBy('ordreVedette', 'asc'), // Tri principal pour la compatibilité
          orderBy('name', 'asc'), // Tri secondaire
          limit(PAGE_SIZE)
        );
        const regularSnapshot = await getDocs(regularQuery);
        const fetchedRegular = regularSnapshot.docs.map(mapDocToProduct);
        const lastVisible = regularSnapshot.docs[regularSnapshot.docs.length - 1] || null;
        setRegularProducts({
          products: fetchedRegular,
          lastDoc: lastVisible,
          hasMore: fetchedRegular.length === PAGE_SIZE,
        });

      } else {
        // --- Logique pour les autres onglets ---
        let q: FirebaseFirestoreTypes.Query = collection(db, 'products');
        if (segment === 'Portables a Touches') {
            q = query(q, where('ram', '==', null), orderBy('name', 'asc'));
        } else {
            const categoryCapitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
            q = query(q, where('category', '==', categoryCapitalized), orderBy('name', 'asc'));
        }
        q = query(q, limit(PAGE_SIZE));

        const querySnapshot = await getDocs(q);
        const newProducts = querySnapshot.docs.map(mapDocToProduct);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        setDataBySegment(prev => ({ ...prev, [segment]: { products: newProducts, lastDoc: lastVisible, hasMore: newProducts.length === PAGE_SIZE }}));
      }
    } catch (error) { console.error(`Erreur de chargement pour le segment ${segment}:`, error); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchProducts(activeSegment);
  }, [fetchProducts, activeSegment]);

  const handleSegmentChange = (segment: Segment) => {
    setActiveSegment(segment);
  };

  const loadMore = useCallback(async () => {
    const segmentState = activeSegment === 'Populaires' ? regularProducts : dataBySegment[activeSegment];
    if (loadingMore || !segmentState || !segmentState.hasMore) return;

    setLoadingMore(true);
    try {
        let q: FirebaseFirestoreTypes.Query = collection(db, 'products');

        if (activeSegment === 'Populaires') {
            q = query(q,
                where('ordreVedette', 'not-in', [1, 2, 3, 4, 5, 6]),
                orderBy('ordreVedette', 'asc'), // CORRECTION: Ajout du tri principal
                orderBy('name', 'asc')
            );
        } else if (activeSegment === 'Portables a Touches') {
            q = query(q, where('ram', '==', null), orderBy('name', 'asc'));
        } else {
            const categoryCapitalized = activeSegment.charAt(0).toUpperCase() + activeSegment.slice(1);
            q = query(q, where('category', '==', categoryCapitalized), orderBy('name', 'asc'));
        }

        q = query(q, startAfter(segmentState.lastDoc), limit(PAGE_SIZE));
        const querySnapshot = await getDocs(q);
        const newProducts = querySnapshot.docs.map(mapDocToProduct);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

        if (activeSegment === 'Populaires') {
            setRegularProducts(prev => ({
                products: [...prev.products, ...newProducts],
                lastDoc: lastVisible,
                hasMore: newProducts.length === PAGE_SIZE,
            }));
        } else {
            setDataBySegment(prev => ({
                ...prev,
                [activeSegment]: {
                    products: [...(prev[activeSegment]?.products || []), ...newProducts],
                    lastDoc: lastVisible,
                    hasMore: newProducts.length === PAGE_SIZE
                }
            }));
        }
    } catch (error) { console.error(`Erreur de pagination pour ${activeSegment}:`, error); }
    finally { setLoadingMore(false); }
  }, [activeSegment, dataBySegment, regularProducts, loadingMore]);

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.gridItem}><ProductGridCard product={item} onPress={() => nav.navigate('ProductDetail' as never, { productId: item.id } as never)}/></View>
  ), [nav]);

  const currentData = activeSegment === 'Populaires'
    ? [...vedetteProducts, ...regularProducts.products]
    : dataBySegment[activeSegment]?.products || [];

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setIsFilterVisible(false);
  }

  const handleApplyFilter = () => {
    setIsFilterVisible(false);
    nav.navigate('FilterScreenResults', {
        minPrice: minPrice,
        maxPrice: maxPrice,
        initialCategory: activeSegment !== 'Populaires' ? activeSegment : undefined
    });
  }

  const ListHeader = (
    <>
      {brandsLoading ? <ActivityIndicator style={{ marginVertical: 20 }} /> :
        <FlatList data={brands} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandCarousel} ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }: { item: Brand }) => (
            <TouchableOpacity onPress={() => nav.navigate('Brand', { brandId: item.id })} activeOpacity={0.8}>
              <View style={styles.circle}><Image source={{ uri: item.logoUrl }} style={styles.circleImg} /></View>
              <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      }
      <FlatList
        horizontal
        data={HORIZONTAL_CARDS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalCardContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.promoCardWrapper}
            onPress={() => item.screen && nav.navigate(item.screen as never)}
            activeOpacity={0.9}
          >
            <ImageBackground source={{ uri: item.image }} style={styles.promoCardLarge} imageStyle={{ borderRadius: 20 }}>
              <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)']} style={styles.promoOverlay}>
                <View>
                  <Text style={styles.promoTitleLarge}>{item.title}</Text>
                  {item.subtitle && <Text style={styles.promoSubLarge}>{item.subtitle}</Text>}
                </View>
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText}>{item.cta}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.fixedHeader}>
        <View style={styles.searchContainer}>
          <Pressable onPress={() => nav.navigate('Catalog' as never)} style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#8A8A8E" />
              <Text style={styles.searchPlaceholder}>Rechercher</Text>
          </Pressable>
          <TouchableOpacity onPress={() => setIsFilterVisible(true)} style={styles.filterButton}>
            <MaterialCommunityIcons name="filter-variant" size={18} color="#111" />
            <Text style={styles.filterButtonText}>Filtrer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODIFICATION: Barre de segments "collante" (sticky) */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
            {SEGMENTS_DATA.map((s) => {
            const active = s.key === activeSegment;
            const iconName = active ? s.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : s.icon;
            return (
                <TouchableOpacity key={s.key} onPress={() => handleSegmentChange(s.key)} style={[styles.segmentPill, active && styles.segmentPillActive]}>
                  <Ionicons name={iconName} size={18} color={active ? '#FF7A00' : '#111'} />
                  <Text style={[styles.segmentPillText, active && styles.segmentPillTextActive]}>{s.label}</Text>
                </TouchableOpacity>
            );
            })}
        </ScrollView>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeSegment}-${item.id}`}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#FF7A00" /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        columnWrapperStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(activeSegment, true)} tintColor="#FF7A00"/> }
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {loading && !refreshing ? <ActivityIndicator size="large" color="#FF7A00" /> : <Text style={styles.emptyText}>Aucun produit dans cette catégorie.</Text>}
            </View>
        }
      />

      <CustomBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
              <Ionicons name="close-circle" size={26} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Prix</Text>
            <View style={styles.priceInputsRow}>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="numeric"
                  placeholder="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceUnit}>FCFA</Text>
              </View>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="numeric"
                  placeholder="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
                <Text style={styles.priceUnit}>FCFA</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.showButton}
            onPress={handleApplyFilter}
          >
            <Text style={styles.showButtonText}>Voir les résultats</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      </CustomBottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  filterButton: {
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 6,
  },
  filterButtonText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 15,
  },
  searchPlaceholder: { color: '#8A8A8E', fontSize: 15, marginLeft: 8, flex: 1 },
  brandCarousel: { paddingHorizontal: 16, paddingVertical: 12, },
  circle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#F2F3F5', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center'
  },
  circleImg: { width: '100%', height: '100%' },
  circleLabel: {
    textAlign: 'center', width: 68, marginTop: 6,
    fontSize: 12, color: '#111'
  },
  segmentContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  segmentScrollContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  segmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F3F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  segmentPillActive: {
    backgroundColor: '#111',
  },
  segmentPillText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111',
  },
  segmentPillTextActive: {
    color: '#fff',
  },
  gridContainer: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1, // Prend l'espace restant
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
      textAlign: 'center',
      color: '#666'
  },
  sheetContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f3f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  priceInput: {
    flex: 1,
    color: '#111',
    fontSize: 16,
  },
  priceUnit: {
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '600',
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
  horizontalCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  promoCardWrapper: {
    width: screenWidth * 0.80,
  },
  promoCardLarge: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
  },
  promoOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  promoTitleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    maxWidth: '90%',
  },
  promoSubLarge: {
    fontSize: 14,
    color: '#f1f5f9',
    maxWidth: '80%',
  },
  promoCta: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  promoCtaText: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default HomeScreen;
