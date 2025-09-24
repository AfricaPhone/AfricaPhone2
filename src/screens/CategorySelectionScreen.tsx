// src/screens/CategorySelectionScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { Segment } from '../types';
import { useFilters } from '../store/FilterContext'; // Importez le hook

const CATEGORIES_DATA: Array<{
  key: Segment | 'Toutes';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'Toutes', label: 'Toutes', icon: 'grid-outline' },
  { key: 'Populaires', label: 'Populaires', icon: 'star-outline' },
  { key: 'tablette', label: 'Tablettes', icon: 'tablet-portrait-outline' },
  { key: 'portable a touche', label: 'A touches', icon: 'keypad-outline' },
  { key: 'accessoire', label: 'Accessoires', icon: 'headset-outline' },
];

const CategorySelectionScreen = () => {
  const navigation = useNavigation();
  const { setCategory } = useFilters(); // Utilisez le contexte pour modifier l'état

  const handleSelect = (category: Segment | 'Toutes') => {
    setCategory(category === 'Toutes' ? undefined : category);
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: (typeof CATEGORIES_DATA)[0] }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelect(item.key)}>
      <Ionicons name={item.icon} size={32} color="#111" />
      <Text style={styles.cardText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisissez une catégorie</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={CATEGORIES_DATA}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  grid: {
    padding: 16,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  cardText: {
    marginTop: 8,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
});

export default CategorySelectionScreen;
