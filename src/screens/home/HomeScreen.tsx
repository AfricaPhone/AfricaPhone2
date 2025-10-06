// src/screens/home/HomeScreen.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from './HomeHeader';
import BrandCarousel from './BrandCarousel';
import PromoCardsCarousel from './PromoCardsCarousel';
import HomeTabNavigator from '../../navigation/HomeTabNavigator';
import { ScrollCoordinatorProvider } from '../../contexts/ScrollCoordinator';
import { usePromoCards } from '../../hooks/usePromoCards';
import { useProducts } from '../../store/ProductContext';
import { RootStackParamList } from '../../types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { promoCards, loading: promoCardsLoading } = usePromoCards();
  const { brands, brandsLoading } = useProducts();

  const handleFilterPress = () => {
    // Navigue vers le nouvel écran de filtres plein écran.
    navigation.navigate('FilterScreen');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader onFilterPress={handleFilterPress} />
      <ScrollCoordinatorProvider>
        <View style={styles.promoWrapper}>
          <BrandCarousel brands={brands} isLoading={brandsLoading} />
          <PromoCardsCarousel promoCards={promoCards} isLoading={promoCardsLoading} />
        </View>
      </ScrollCoordinatorProvider>
      <View style={styles.tabNavigator}>
        <HomeTabNavigator />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  promoWrapper: { backgroundColor: '#fff', paddingVertical: 6, gap: 6 },
  tabNavigator: { flex: 1 },
});

export default HomeScreen;
