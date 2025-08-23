// src/screens/CatalogScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Keyboard,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../types';
import { collection, query, where, orderBy, getDocs, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import ProductGridCard from '../components/ProductGridCard';

import { searchClient as createSearchClient } from '@algolia/client-search';

// --- Config Algolia ---
const ALGOLIA_APP_ID = 'S18U9VKLQE';
const ALGOLIA_SEARCH_API_KEY = '2a55d141d98d03a2b22b3836c7dee3f8'; // ← remplace par ta Search API Key (Search-Only)
const ALGOLIA_INDEX_NAME = 'products';
const algolia = createSearchClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);

// --- Hooks ---
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// --- Composants ---
const RECENT_SEARCHES = ['Oale', 'Villaon', 'Redmi'];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const SearchResultItem: React.FC<{ item: Product; query: string; onPress: () => void }> = ({
  item,
  query,
  onPress,
}) => {
  const renderHighlightedText = () => {
    const title = item.title || '';
    if (!query) {
      return <Text style={styles.resultTitle}>{title}</Text>;
    }
    const parts = title.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi'));
    return (
      <Text style={styles.resultTitle} numberOfLines={2}>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={index} style={styles.highlightedText}>
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  return (
    <TouchableOpacity style={styles.resultItem} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        {renderHighlightedText()}
        {item.rom && item.ram && (
          <Text style={styles.resultSpecs}>
            {item.rom}GB ROM / {item.ram}GB RAM
          </Text>
        )}
        <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// --- Util ---
const formatPrice = (value?: number) => {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
      value
    );
  } catch {
    return `${value} F`;
  }
};

// CORRECTION: Ajout d'une fonction de mappage pour correspondre au type Product
const mapDocToProduct = (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.name, // Mappe 'name' vers 'title'
    price: data.price,
    image: data.imageUrl, // Mappe 'imageUrl' vers 'image'
    category: data.brand?.toLowerCase() || 'inconnu',
    description: data.description,
    rom: data.rom,
    ram: data.ram,
  };
};

type AlgoliaHit = {
  objectID: string;
  name?: string;
  brand?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  ordreVedette?: number;
  rom?: number;
  ram?: number;
};

const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Nouveaux états pour les produits vedettes
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  // Effet pour charger les produits vedettes depuis Firestore
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setFeaturedLoading(true);
        const q = query(collection(db, 'products'), where('ordreVedette', '>=', 1), orderBy('ordreVedette', 'asc'));
        const querySnapshot = await getDocs(q);
        // CORRECTION: Utilisation de la fonction de mappage
        const products = querySnapshot.docs.map(mapDocToProduct);
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Erreur de chargement des produits vedettes:', error);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  // 🔎 Recherche en temps réel via Algolia (v5 + @algolia/client-search)
  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      const q = debouncedQuery.trim();
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await algolia.searchSingleIndex<AlgoliaHit>({
          indexName: ALGOLIA_INDEX_NAME,
          searchParams: {
            query: q,
            hitsPerPage: 20,
            attributesToRetrieve: ['name', 'brand', 'description', 'price', 'imageUrl', 'ordreVedette', 'rom', 'ram'],
          },
        });

        if (cancelled) return;

        const mapped: Product[] = res.hits.map((hit: AlgoliaHit) => ({
          id: hit.objectID,
          title: hit.name || '',
          price: hit.price ?? 0,
          image: hit.imageUrl || '',
          category: (hit.brand || 'inconnu').toLowerCase(),
          description: hit.description,
          rom: hit.rom,
          ram: hit.ram,
        }));
        setResults(mapped);
      } catch (err) {
        console.error('Algolia search error:', err);
        setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    navigation.navigate('ProductList', {
      title: `Recherche: "${searchQuery}"`,
      searchQuery: searchQuery.trim(),
    });
  };

  const renderSearchHub = () => (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Section title="Recherches Populaires">
        <View style={styles.chipContainer}>
          {RECENT_SEARCHES.map(item => (
            <TouchableOpacity key={item} style={styles.chip} onPress={() => setSearchQuery(item)}>
              <Ionicons name="time-outline" size={16} color="#555" />
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {featuredLoading ? (
        <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 20 }} />
      ) : (
        <Section title="Produits en Vedette">
          <FlatList
            data={featuredProducts}
            numColumns={2}
            keyExtractor={item => item.id}
            scrollEnabled={false} // Le ScrollView parent gère le défilement
            columnWrapperStyle={styles.featuredGridContainer}
            renderItem={({ item }) => (
              <View style={styles.featuredGridItem}>
                <ProductGridCard
                  product={item}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                />
              </View>
            )}
          />
        </Section>
      )}
    </ScrollView>
  );

  const renderSearchResults = () => (
    <View style={styles.resultsContainer}>
      {isSearching ? (
        <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <SearchResultItem
              item={item}
              query={debouncedQuery}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyResults}>
              <Text style={styles.emptyResultsText}>Aucun résultat pour "{debouncedQuery}"</Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recherche</Text>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8A8A8E" />
          <TextInput
            placeholder="Rechercher des produits…"
            placeholderTextColor="#8A8A8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            style={styles.searchInput}
            autoFocus={false}
          />
        </View>
      </View>

      {searchQuery.trim().length > 0 ? renderSearchResults() : renderSearchHub()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  searchBarContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { color: '#111', fontSize: 16, marginLeft: 8, flex: 1 },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f2f3f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  chipText: {
    color: '#333',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f2f3f5',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  highlightedText: {
    color: '#FF7A00',
  },
  resultSpecs: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginTop: 4,
  },
  emptyResults: {
    padding: 20,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#666',
  },
  featuredGridContainer: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  featuredGridItem: {
    width: '48%',
    marginBottom: 16,
  },
});

export default CatalogScreen;
