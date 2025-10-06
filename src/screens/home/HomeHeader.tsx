// src/screens/home/HomeHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../types';

interface Props {
  onFilterPress: () => void;
}

type HomeHeaderNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const HomeHeader: React.FC<Props> = ({ onFilterPress }) => {
  const navigation = useNavigation<HomeHeaderNavigation>();

  return (
    <View style={styles.fixedHeader}>
      <View style={styles.searchContainer}>
        <Pressable onPress={() => navigation.navigate('Catalog')} style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8A8A8E" />
          <Text style={styles.searchPlaceholder}>Rechercher</Text>
        </Pressable>
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
          <MaterialCommunityIcons name="filter-variant" size={18} color="#111" />
          <Text style={styles.filterButtonText}>Filtrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPlaceholder: {
    color: '#8A8A8E',
    fontSize: 15,
    marginLeft: 8,
    flex: 1,
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
});

export default HomeHeader;
