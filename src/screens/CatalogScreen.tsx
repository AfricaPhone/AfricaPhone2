// src/screens/CatalogScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { useProducts } from '../store/ProductContext';
import { Brand, Product } from '../types';
import { collection, query, where, orderBy, limit, getDocs, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { formatPrice } from '../utils/formatPrice';

// --- Hooks ---
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
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

const SearchResultItem: React.FC<{ item: Product; query: string; onPress: () => void }> = ({ item, query, onPress }) => {
  const renderHighlightedText = () => {
    const title = item.title || ''; 
    if (!query) {
      return <Text style={styles.resultTitle}>{title}</Text>;
    }
    const parts = title.split(new RegExp(`(${query})`, 'gi'));
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
        {item.rom && item.ram && <Text style={styles.resultSpecs}>{item.rom}GB ROM / {item.ram}GB RAM</Text>}
        <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
};


const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { brands } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', debouncedQuery),
          where('name', '<=', debouncedQuery + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const fetchedProducts = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.name,
                price: data.price,
                image: data.imageUrl,
                category: data.brand?.toLowerCase() || 'inconnu',
                rating: data.rating,
                description: data.description,
                rom: data.rom,
                ram: data.ram,
                ram_base: data.ram_base,
                ram_extension: data.ram_extension,
            } as Product;
        });
        setResults(fetchedProducts);
      } catch (error) {
        console.error("Error fetching search results:", error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchResults();
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
    </ScrollView>
  );

  const renderSearchResults = () => (
    <View style={styles.resultsContainer}>
      {isSearching ? (
        <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
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
  brandCarousel: {
    paddingHorizontal: 16,
    gap: 12,
  },
  brandCard: {
      width: 100,
      height: 60,
      backgroundColor: '#f2f3f5',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
  },
  brandLogo: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
  },
  // Styles for real-time results
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
    color: '#FF7A00', // Orange color for highlighting
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
});

export default CatalogScreen;