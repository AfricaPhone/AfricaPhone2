// src/components/PromoCodeModal.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import CustomBottomSheet from './CustomBottomSheet';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (promoCode: string) => void;
  isLoading?: boolean;
}

const PromoCodeModal: React.FC<Props> = ({ visible, onClose, onApply, isLoading = false }) => {
  const [promoCode, setPromoCode] = useState('');

  const handleApplyPress = () => {
    onApply(promoCode);
  };

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajouter un code promo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={26} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Si vous avez un code de réduction, entrez-le ci-dessous.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="CODEPROMO"
          placeholderTextColor="#9ca3af"
          value={promoCode}
          onChangeText={setPromoCode}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPress} disabled={isLoading}>
          <Text style={styles.applyBtnText}>
            Appliquer
          </Text>
        </TouchableOpacity>
      </View>
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    height: 52,
    backgroundColor: '#f2f3f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  applyBtn: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PromoCodeModal;