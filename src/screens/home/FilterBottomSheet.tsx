// src/screens/home/FilterBottomSheet.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CustomBottomSheet from '../../components/CustomBottomSheet';

// Définition des fourchettes de prix
const PRICE_RANGES = [
  { label: 'Moins de 50k', min: 0, max: 49999 },
  { label: '50k - 100k', min: 50000, max: 99999 },
  { label: '100k - 200k', min: 100000, max: 199999 },
  { label: 'Plus de 200k', min: 200000, max: 9999999 },
];

type PriceRange = typeof PRICE_RANGES[0] | null;

interface Props {
  visible: boolean;
  onClose: () => void;
  onApplyFilter: (minPrice: string, maxPrice: string) => void;
}

const FilterBottomSheet: React.FC<Props> = ({ visible, onClose, onApplyFilter }) => {
  const [selectedRange, setSelectedRange] = useState<PriceRange>(null);

  const handleApply = () => {
    const minPrice = selectedRange ? String(selectedRange.min) : '';
    const maxPrice = selectedRange ? String(selectedRange.max) : '';
    onApplyFilter(minPrice, maxPrice);
  };

  const handleReset = () => {
    setSelectedRange(null);
    onApplyFilter('', ''); // Applique un filtre vide pour réinitialiser
  };

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetContent}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filtres</Text>
        </View>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Fourchette de prix (FCFA)</Text>
          <View style={styles.chipContainer}>
            {PRICE_RANGES.map((range) => {
              const isActive = selectedRange?.label === range.label;
              return (
                <TouchableOpacity
                  key={range.label}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setSelectedRange(range)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity style={styles.showButton} onPress={handleApply}>
          <Text style={styles.showButtonText}>Voir les résultats</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      </View>
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  chip: {
    backgroundColor: '#f2f3f5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
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
});

export default FilterBottomSheet;
