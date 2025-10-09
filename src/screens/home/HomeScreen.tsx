// src/screens/home/HomeScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from './HomeHeader';
import HomeHero from './HomeHero';
import HomeTabNavigator from '../../navigation/HomeTabNavigator';
import { RootStackParamList } from '../../types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleFilterPress = () => {
    // Navigue vers le nouvel ecran de filtres plein ecran.
    navigation.navigate('FilterScreen');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
      >
        <HomeHeader onFilterPress={handleFilterPress} />
        <HomeHero />
        <View style={styles.tabNavigator}>
          <HomeTabNavigator />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 24 },
  tabNavigator: {
    flex: 1,
    minHeight: 520,
  },
});

export default HomeScreen;
