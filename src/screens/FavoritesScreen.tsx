// src/screens/FavoritesScreen.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFavorites } from '../store/FavoritesContext';
import { useProducts } from '../store/ProductContext';
import { Product } from '../types';
import ProductGridCard from '../components/ProductGridCard';
import ProductListItem from '../components/ProductListItem';

type ViewMode = 'grid' | 'list';
type SortKey = 'date' | 'priceAsc' | 'priceDesc';

const FavoritesScreen: React.FC = () => {
  const { collections, createCollection } = useFavorites();
  const { getProductById } = useProducts();
  const navigation = useNavigation<any>();

  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id || null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('date');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      if (!selectedCollection) {
        setProducts([]);
        return;
      }
      setLoading(true);
      const productIds = Array.from(selectedCollection.productIds);
      const fetchedProducts = await Promise.all(productIds.map(id => getProductById(id)));

      const productList = fetchedProducts.filter(Boolean) as Product[];

      switch (sort) {
        case 'priceAsc':
          productList.sort((a, b) => a.price - b.price);
          break;
        case 'priceDesc':
          productList.sort((a, b) => b.price - a.price);
          break;
        case 'date':
        default:
          break;
      }
      setProducts(productList);
      setLoading(false);
    };

    fetchFavoriteProducts();
  }, [selectedCollection, sort, getProductById]);

  const handleCreateCollection = () => {
    Alert.prompt(
      'Nouvelle Collection',
      'Entrez un nom pour votre nouvelle collection.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer',
          onPress: (name?: string) => {
            if (typeof name === 'string' && name.trim().length > 0) {
            createCollection(name.trim());
          }
          },
        },
      ],
      'plain-text'
    );
  };

  // OPTIMISATION: Utilisation de useCallback pour stabiliser la fonction renderItem.
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {collections.map(collection => (
            <TouchableOpacity
              key={collection.id}
              style={[styles.tab, selectedCollectionId === collection.id && styles.tabActive]}
              onPress={() => setSelectedCollectionId(collection.id)}
            >
              <Text style={[styles.tabText, selectedCollectionId === collection.id && styles.tabTextActive]}>
                {collection.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addTab} onPress={handleCreateCollection}>
            <Ionicons name="add" size={20} color="#111" />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.actionsRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViewMode('grid')} style={styles.viewBtn}>
            <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#111' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.viewBtn}>
            <Ionicons name="list" size={22} color={viewMode === 'list' ? '#111' : '#999'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <MaterialCommunityIcons name="sort" size={18} color="#111" />
          <Text style={styles.sortText}>Trier</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF7A00" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={products}
          key={viewMode}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun favori</Text>
              <Text style={styles.emptySubText}>Appuyez sur l'icône ❤️ sur un produit pour l'ajouter.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: '#f2f3f5',
    marginRight: 10,
  },
  tabActive: { backgroundColor: '#111' },
  tabText: { color: '#111', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  addTab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  viewBtn: { padding: 4 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f2f3f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  sortText: { fontWeight: '600', color: '#111' },
  listContent: { paddingTop: 16, paddingBottom: 20 },
  gridContainer: { paddingHorizontal: 16, justifyContent: 'space-between' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});

export default FavoritesScreen;
