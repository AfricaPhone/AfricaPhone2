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

  const handleFilterPress = () => {
    // Navigue vers le nouvel écran de filtres plein écran.
    navigation.navigate('FilterScreen');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader onFilterPress={handleFilterPress} />
      <HomeTabNavigator />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;
