// src/screens/home/FilterBottomSheet.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import CustomBottomSheet from '../../components/CustomBottomSheet';
import { Segment } from './ProductSegments';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApplyFilter: (minPrice: string, maxPrice: string) => void;
  activeSegment: Segment;
}

const FilterBottomSheet: React.FC<Props> = ({ visible, onClose, onApplyFilter, activeSegment }) => {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleApply = () => {
    onApplyFilter(minPrice, maxPrice);
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    onClose();
  };

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetContent}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filtres</Text>
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
});

export default FilterBottomSheet;
