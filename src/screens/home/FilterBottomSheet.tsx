// src/screens/home/FilterBottomSheet.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, FilterOptions, Segment } from '../../types';
import { useProducts } from '../../store/ProductContext';
import { useNavigation } from '@react-navigation/native';

// Définition des capacités
const CAPACITY_OPTIONS = [
  { label: '64GB + 4GB', rom: 64, ram: 4 },
  { label: '128GB + 8GB', rom: 128, ram: 8 },
  { label: '256GB + 12GB', rom: 256, ram: 12 },
  { label: '512GB + 16GB', rom: 512, ram: 16 },
];
export type Capacity = (typeof CAPACITY_OPTIONS)[0] | null;

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
}

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

const FilterModal: React.FC<Props> = ({ visible, onClose, onApply }) => {
  const { brands } = useProducts();
  const navigation = useNavigation<any>();

  const [selectedCategory, setSelectedCategory] = useState<Segment | undefined>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([]);
  const [selectedCapacity, setSelectedCapacity] = useState<Capacity>(null);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isVedette, setIsVedette] = useState(false);

  const toggleBrand = (brand: Brand) => {
    setSelectedBrands(prev =>
      prev.find(b => b.id === brand.id) ? prev.filter(b => b.id !== brand.id) : [...prev, brand]
    );
  };

  const handleApply = () => {
    const filters: FilterOptions = {
      category: selectedCategory,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      brands: selectedBrands.length > 0 ? selectedBrands : undefined,
      rom: selectedCapacity?.rom,
      ram: selectedCapacity?.ram,
      enPromotion: isPromotion || undefined,
      isVedette: isVedette || undefined,
    };
    onApply(filters);
  };

  const handleReset = () => {
    setSelectedCategory(undefined);
    setMinPrice('');
    setMaxPrice('');
    setSelectedBrands([]);
    setSelectedCapacity(null);
    setIsPromotion(false);
    setIsVedette(false);
    onApply({});
  };

  const navigateToCategories = () => {
    navigation.navigate('CategorySelection', {
      onSelectCategory: (category: Segment | undefined) => {
        setSelectedCategory(category);
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sélectionnez les filtres</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Section Catégorie */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégorie</Text>
            <FilterRow label={selectedCategory || 'Toutes les catégories'} onPress={navigateToCategories}>
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
                  isSelected={!!selectedBrands.find(b => b.id === brand.id)}
                  onPress={() => toggleBrand(brand)}
                />
              ))}
            </View>
          </View>

          {/* Section Prix */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prix</Text>
            <View style={styles.priceInputs}>
              <TextInput
                style={styles.input}
                placeholder="Min"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <TextInput
                style={styles.input}
                placeholder="Max"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={maxPrice}
                onChangeText={setMaxPrice}
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
                  isSelected={selectedCapacity?.label === cap.label}
                  onPress={() => setSelectedCapacity(cap)}
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
                  value={isPromotion}
                  onValueChange={setIsPromotion}
                  trackColor={{ false: '#e5e7eb', true: '#FF7A00' }}
                />
              </FilterRow>
              <FilterRow label="Produit Vedette">
                <Switch
                  value={isVedette}
                  onValueChange={setIsVedette}
                  trackColor={{ false: '#e5e7eb', true: '#FF7A00' }}
                />
              </FilterRow>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerButton, styles.resetButton]} onPress={handleReset}>
            <Text style={[styles.footerButtonText, styles.resetButtonText]}>RÉINITIALISER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerButton, styles.applyButton]} onPress={handleApply}>
            <Text style={[styles.footerButtonText, styles.applyButtonText]}>APPLIQUER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
  headerButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 24 },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12 },
  priceInputs: { flexDirection: 'row', gap: 12 },
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
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 12,
  },
  footerButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  footerButtonText: { fontSize: 16, fontWeight: 'bold' },
  resetButton: { backgroundColor: '#e5e7eb' },
  resetButtonText: { color: '#1f2937' },
  applyButton: { backgroundColor: '#FF7A00' },
  applyButtonText: { color: '#fff' },
});

export default FilterModal;
