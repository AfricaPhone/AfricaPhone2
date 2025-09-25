// src/screens/FilterScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Brand, FilterOptions } from '../types';
import { useProducts } from '../store/ProductContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useFilters, PriceRange } from '../store/FilterContext';
import { RootStackParamList } from '../types';

// Définition des capacités (inchangé)
const CAPACITY_OPTIONS = [
  { label: '64GB + 4GB', rom: 64, ram: 4 },
  { label: '128GB + 8GB', rom: 128, ram: 8 },
  { label: '256GB + 12GB', rom: 256, ram: 12 },
  { label: '512GB + 16GB', rom: 512, ram: 16 },
];
export type Capacity = (typeof CAPACITY_OPTIONS)[0] | null;

// MODIFICATION: Fourchettes de prix étendues
const PRICE_RANGE_OPTIONS: PriceRange[] = [
  { key: 'under_50k', label: '- 50 000', max: 50000 },
  { key: '50k_100k', label: '50k - 100k', min: 50000, max: 100000 },
  { key: '100k_150k', label: '100k - 150k', min: 100000, max: 150000 },
  { key: '150k_250k', label: '150k - 250k', min: 150000, max: 250000 },
  { key: '250k_500k', label: '250k - 500k', min: 250000, max: 500000 },
  { key: 'over_500k', label: '+ 500 000', min: 500000 },
];

const FilterRow: React.FC<{ label: string; children: React.ReactNode; onPress?: () => void }> = ({
  label,
  children,
  onPress,
}) => (
  <Pressable onPress={onPress} style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.rowValue}>{children}</View>
  </Pressable>
);

const Chip: React.FC<{ label: string; isSelected: boolean; onPress: () => void }> = ({
  label,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity style={[styles.chip, isSelected && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const FilterScreen: React.FC = () => {
  const { brands } = useProducts();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const {
    filters,
    setPriceRange,
    setPriceRangeByKey,
    toggleBrand,
    setCapacity,
    setPromotion,
    setVedette,
    resetFilters,
    activeFilterCount,
  } = useFilters();

  const [minPrice, setMinPrice] = useState(filters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice || '');

  useEffect(() => {
    setMinPrice(filters.minPrice || '');
    setMaxPrice(filters.maxPrice || '');
  }, [filters.minPrice, filters.maxPrice]);

  const handleApply = () => {
    setPriceRange(minPrice, maxPrice);
    navigation.navigate('FilterScreenResults', {});
  };

  const handleReset = () => {
    resetFilters();
  };

  const navigateToCategories = () => {
    navigation.navigate('CategorySelection');
  };

  const handlePriceRangeSelect = (range: PriceRange) => {
    if (filters.selectedPriceRangeKey === range.key) {
      setPriceRangeByKey(null);
    } else {
      setPriceRangeByKey(range);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filtres</Text>
        <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
          <Text style={styles.resetLink}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section Catégorie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégorie</Text>
          <FilterRow label={filters.category || 'Toutes les catégories'} onPress={navigateToCategories}>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </FilterRow>
        </View>

        {/* Section Marques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marques</Text>
          <View style={styles.chipContainer}>
            {brands.map(brand => (
              <Chip
                key={brand.id}
                label={brand.name}
                isSelected={!!filters.brands?.find(b => b.id === brand.id)}
                onPress={() => toggleBrand(brand)}
              />
            ))}
          </View>
        </View>

        {/* Section Prix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prix</Text>
          <View style={styles.chipContainer}>
            {PRICE_RANGE_OPTIONS.map(range => (
              <Chip
                key={range.key}
                label={range.label}
                isSelected={filters.selectedPriceRangeKey === range.key}
                onPress={() => handlePriceRangeSelect(range)}
              />
            ))}
          </View>
          <View style={styles.priceInputs}>
            <TextInput
              style={styles.input}
              placeholder="Min"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={String(minPrice)}
              onChangeText={setMinPrice}
              onFocus={() => setPriceRangeByKey(null)}
            />
            <TextInput
              style={styles.input}
              placeholder="Max"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={String(maxPrice)}
              onChangeText={setMaxPrice}
              onFocus={() => setPriceRangeByKey(null)}
            />
          </View>
        </View>

        {/* Section Capacité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacité (Stockage + RAM)</Text>
          <View style={styles.chipContainer}>
            {CAPACITY_OPTIONS.map(cap => (
              <Chip
                key={cap.label}
                label={cap.label}
                isSelected={filters.ram === cap.ram && filters.rom === cap.rom}
                onPress={() => setCapacity(cap)}
              />
            ))}
          </View>
        </View>

        {/* Section Avantages & Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avantages & Services</Text>
          <View style={styles.switchRows}>
            <FilterRow label="En Promotion">
              <Switch
                value={filters.enPromotion}
                onValueChange={setPromotion}
                trackColor={{ false: '#e5e7eb', true: '#FF7A00' }}
              />
            </FilterRow>
            <FilterRow label="Produit Vedette">
              <Switch
                value={filters.isVedette}
                onValueChange={setVedette}
                trackColor={{ false: '#e5e7eb', true: '#FF7A00' }}
              />
            </FilterRow>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.footerButton, styles.applyButton]} onPress={handleApply}>
          <Text style={[styles.footerButtonText, styles.applyButtonText]}>
            VOIR LES RÉSULTATS {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerButton: { padding: 4, minWidth: 80 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  resetLink: { color: '#FF7A00', fontWeight: '600', textAlign: 'right' },
  scrollContent: { paddingBottom: 24 },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12 },
  priceInputs: { flexDirection: 'row', gap: 12, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
  },
  switchRows: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 16, color: '#1f2937' },
  rowValue: { flexDirection: 'row', alignItems: 'center' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#fff1e6',
    borderColor: '#FF7A00',
  },
  chipText: {
    color: '#374151',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FF7A00',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  footerButton: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  footerButtonText: { fontSize: 16, fontWeight: 'bold' },
  applyButton: { backgroundColor: '#FF7A00' },
  applyButtonText: { color: '#fff' },
});

export default FilterScreen;
