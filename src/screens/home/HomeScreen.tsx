// src/screens/home/HomeScreen.tsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import des composants
import HomeHeader from './HomeHeader';
import FilterBottomSheet, { Capacity } from './FilterBottomSheet';
import HomeTabNavigator from '../../navigation/HomeTabNavigator';
import { RootStackParamList } from '../../types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const handleApplyFilter = (minPrice: string, maxPrice: string, capacity?: Capacity) => {
    setIsFilterVisible(false);
    navigation.navigate('FilterScreenResults', {
      minPrice,
      maxPrice,
      rom: capacity?.rom,
      ram: capacity?.ram,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader onFilterPress={() => setIsFilterVisible(true)} />
      <HomeTabNavigator />
      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApplyFilter={handleApplyFilter}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;
