// src/screens/home/HomeHeader.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from '@react-native-firebase/firestore';
import { db } from '../../firebase/config';
import { Product, RootStackParamList, TabParamList } from '../../types';

interface Props {
  onFilterPress: () => void;
}

type HomeHeaderNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const MAX_RECENT_SEARCHES = 6;
const RECENT_SEARCH_KEY = '@africaphone/recent-searches';

const HomeHeader: React.FC<Props> = ({ onFilterPress }) => {
  const navigation = useNavigation<HomeHeaderNavigation>();

  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedQuery = useDebounce(searchTerm, 250);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCH_KEY)
      .then(value => {
        if (!value) {
          return;
        }
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const startValue = term;
        const endValue =
          startValue.slice(0, -1) + String.fromCharCode(startValue.charCodeAt(startValue.length - 1) + 1);

        const snapshot = await getDocs(
          query(collection(db, 'products'), orderBy('name'), startAt(startValue), endAt(endValue), limit(6))
        );

        if (!cancelled) {
          const mapped = snapshot.docs.map(mapDocToProduct);
          setSuggestions(mapped);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    };

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const updateRecentSearches = useCallback((term: string) => {
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const handleSubmitSearch = useCallback(() => {
    const term = searchTerm.trim();
    if (!term) {
      return;
    }
    updateRecentSearches(term);
    Keyboard.dismiss();
    setIsFocused(false);
    navigation.navigate('ProductList', {
      title: `Résultats pour "${term}"`,
      searchQuery: term,
    });
  }, [navigation, searchTerm, updateRecentSearches]);

  const handleSelectSuggestion = useCallback(
    (product: Product) => {
      updateRecentSearches(product.title);
      Keyboard.dismiss();
      setIsFocused(false);
      navigation.navigate('ProductDetail', { productId: product.id });
    },
    [navigation, updateRecentSearches]
  );

  const limitedSuggestions = useMemo(() => suggestions.slice(0, 5), [suggestions]);

  const showSuggestions =
    isFocused && (debouncedQuery.trim().length > 0 || recentSearches.length > 0 || suggestions.length > 0);

  return (
    <View style={styles.fixedHeader}>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color="#8A8A8E" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Rechercher un appareil ou une marque"
            placeholderTextColor="#8A8A8E"
            returnKeyType="search"
            onSubmitEditing={handleSubmitSearch}
            onFocus={() => setIsFocused(true)}
            style={styles.searchInput}
          />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityLabel="Effacer la recherche">
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
          <MaterialCommunityIcons name="filter-variant" size={18} color="#111" />
          <Text style={styles.filterButtonText}>Filtrer</Text>
        </TouchableOpacity>
      </View>

      {showSuggestions ? (
        <View style={styles.suggestionCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchTerm.trim().length > 0 ? (
              <TouchableOpacity style={styles.rowAction} onPress={handleSubmitSearch} activeOpacity={0.8}>
                <Ionicons name="enter-outline" size={18} color="#111" />
                <Text style={styles.rowActionText}>Rechercher “{searchTerm.trim()}” dans le catalogue</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Suggestions</Text>
                {loadingSuggestions ? <ActivityIndicator size="small" color="#6b7280" /> : null}
              </View>
              {limitedSuggestions.length === 0 && !loadingSuggestions ? (
                <Text style={styles.emptySuggestion}>Aucun produit ne correspond à votre recherche.</Text>
              ) : (
                limitedSuggestions.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectSuggestion(product)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={styles.suggestionTitle}>{product.title}</Text>
                      <Text style={styles.suggestionMeta}>
                        {product.segment} · {product.price}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#6b7280" />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {recentSearches.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recherches récentes</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setRecentSearches([]);
                      AsyncStorage.removeItem(RECENT_SEARCH_KEY).catch(() => undefined);
                    }}
                  >
                    <Text style={styles.clearHistory}>Effacer</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentChipRow}>
                  {recentSearches.map(recent => (
                    <TouchableOpacity
                      key={recent}
                      style={styles.recentChip}
                      onPress={() => {
                        setSearchTerm(recent);
                        setIsFocused(true);
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color="#6b7280" />
                      <Text style={styles.recentChipText}>{recent}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

export default HomeHeader;

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111',
    paddingVertical: 0,
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
  suggestionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    maxHeight: 320,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptySuggestion: {
    fontSize: 12,
    color: '#6b7280',
  },
  recentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  recentChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  clearHistory: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function mapDocToProduct(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
): Product {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls,
    category: (data.brand || 'inconnu').toLowerCase(),
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
    specifications: data.specifications || [],
    enPromotion: data.enPromotion,
    isVedette: data.ordreVedette > 0,
  };
}
