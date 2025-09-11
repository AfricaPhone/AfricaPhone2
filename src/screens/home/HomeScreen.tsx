// src/screens/home/HomeScreen.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from './HomeHeader';
import HomeTabNavigator from '../../navigation/HomeTabNavigator';
import { RootStackParamList } from '../../types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // MODIFICATION: Simplification de la gestion du filtre.
  // La logique de la Bottom Sheet est supprimée.
  const handleFilterPress = () => {
    // Navigue vers l'écran des résultats en indiquant d'ouvrir le panneau de filtres.
    navigation.navigate('FilterScreenResults', { openFilters: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* La prop onFilterPress déclenche maintenant une navigation */}
      <HomeHeader onFilterPress={handleFilterPress} />
      <HomeTabNavigator />

      {/* La BottomSheet est complètement retirée de cet écran. */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;
