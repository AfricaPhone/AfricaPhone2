// src/screens/home/HomeScreen.tsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import des composants
import HomeHeader from './HomeHeader';
import FilterModal from './FilterBottomSheet'; // Le fichier a été réécrit, mais le nom est conservé pour l'instant
import HomeTabNavigator from '../../navigation/HomeTabNavigator';
import { RootStackParamList, FilterOptions } from '../../types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const handleApplyFilter = (filters: FilterOptions) => {
    setIsFilterVisible(false);
    // Naviguer vers l'écran de résultats avec tous les filtres
    navigation.navigate('FilterScreenResults', filters);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader onFilterPress={() => setIsFilterVisible(true)} />
      <HomeTabNavigator />
      <FilterModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApply={handleApplyFilter}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;