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
import { useFilters } from '../../store/FilterContext';

interface Props {
  onFilterPress: () => void;
}

type HomeHeaderNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type QuickCategory = {
  id: string;
  label: string;
  query: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MAX_RECENT_SEARCHES = 6;
const RECENT_SEARCH_KEY = '@africaphone/recent-searches';

const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'flagship', label: 'Flagships', query: 'Galaxy S24', color: '#1d4ed8', icon: 'sparkles-outline' },
  { id: 'budget', label: 'Budget', query: 'Itel', color: '#059669', icon: 'wallet-outline' },
  { id: 'creator', label: 'Créateurs', query: 'Stabilisateur', color: '#c026d3', icon: 'aperture-outline' },
  { id: 'audio', label: 'Audio', query: 'AirPods', color: '#f97316', icon: 'musical-notes-outline' },
  { id: 'gaming', label: 'Gaming', query: 'Infinix Zero', color: '#dc2626', icon: 'game-controller-outline' },
];

const HomeHeader: React.FC<Props> = ({ onFilterPress }) => {
  const navigation = useNavigation<HomeHeaderNavigation>();
  const { activeFilterCount } = useFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedQuery = useDebounce(searchTerm, 250);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCH_KEY)
      .then(value => {
        if (!value) return;
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
    if (!term) return;
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
      navigation.navigate('ProductDetail', { productId: product.id, product });
    },
    [navigation, updateRecentSearches]
  );

  const handleQuickCategory = useCallback(
    (category: QuickCategory) => {
      setSearchTerm(category.query);
      updateRecentSearches(category.query);
      setIsFocused(false);
      navigation.navigate('ProductList', {
        title: category.label,
        searchQuery: category.query,
      });
    },
    [navigation, updateRecentSearches]
  );

  const limitedSuggestions = useMemo(() => suggestions.slice(0, 5), [suggestions]);
  const showSuggestions =
    isFocused && (debouncedQuery.trim().length > 0 || recentSearches.length > 0 || suggestions.length > 0);

  return (
    <View style={styles.root}>
      <View style={styles.heroCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color="#e2e8f0" />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Rechercher un appareil ou une marque"
              placeholderTextColor="#cbd5f5"
              returnKeyType="search"
              onSubmitEditing={handleSubmitSearch}
              onFocus={() => setIsFocused(true)}
              style={styles.searchInput}
            />
            {searchTerm.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityLabel="Effacer la recherche">
                <Ionicons name="close-circle" size={18} color="#cbd5f5" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
            <MaterialCommunityIcons name="filter-variant" size={18} color="#0f172a" />
            <Text style={styles.filterButtonText}>Filtres</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        <QuickCategories categories={QUICK_CATEGORIES} onSelect={handleQuickCategory} />
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
                    <Text style={styles.clearHistory}>Effacer l’historique</Text>
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

type QuickCategoriesProps = {
  categories: QuickCategory[];
  onSelect: (category: QuickCategory) => void;
};

const QuickCategories: React.FC<QuickCategoriesProps> = ({ categories, onSelect }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCategories}>
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[styles.quickCategory, { backgroundColor: `${category.color}15` }]}
          onPress={() => onSelect(category)}
          activeOpacity={0.85}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: category.color }]}>
            <Ionicons name={category.icon} size={16} color="#fff" />
          </View>
          <Text style={styles.quickLabel}>{category.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0f172a',
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 16,
    gap: 16,
    backgroundColor: '#111b2e',
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    backgroundColor: '#0b1324',
    borderRadius: 18,
    height: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#f8fafc',
    paddingVertical: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f97316',
  },
  filterButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  quickCategories: {
    gap: 12,
  },
  quickCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  quickIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionCard: {
    marginHorizontal: 16,
    marginTop: 10,
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
  const rawImageUrls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
  const imageUrls = rawImageUrls.length > 0 ? rawImageUrls : data.imageUrl ? [data.imageUrl] : [];
  const price = typeof data.price === 'number' ? data.price : typeof data.price === 'string' ? Number(data.price) : 0;
  const oldPrice = typeof data.oldPrice === 'number' ? data.oldPrice : typeof data.old_price === 'number' ? data.old_price : undefined;
  return {
    id: doc.id,
    title: data.name,
    price,
    oldPrice,
    image: imageUrls.length > 0 ? imageUrls[0] : '',
    imageUrls,
    gallery: imageUrls,
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
