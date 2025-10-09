// src/screens/home/BrandCarousel.tsx
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Brand, RootStackParamList } from '../../types';
import { useScrollCoordinator } from '../../contexts/ScrollCoordinator';

interface Props {
  brands: Brand[];
  isLoading: boolean;
  showAllCta?: boolean;
}

const BrandCarousel: React.FC<Props> = ({ brands, isLoading, showAllCta = false }) => {
  const { lockParentScroll, unlockParentScroll } = useScrollCoordinator();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 20, height: 98 }} />;
  }

  if (!brands.length) {
    return null;
  }

  const data = showAllCta ? [...brands, { id: 'cta', name: 'Toutes les marques' } as Brand] : brands;

  return (
    <FlatList
      nestedScrollEnabled
      onScrollBeginDrag={lockParentScroll}
      onScrollEndDrag={unlockParentScroll}
      onMomentumScrollEnd={unlockParentScroll}
      data={data}
      keyExtractor={item => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
      renderItem={({ item }) => {
        if (item.id === 'cta') {
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Brand', { brandId: brands[0]?.id ?? '' })}
              style={styles.ctaCard}
            >
              <Text style={styles.ctaText}>Voir toutes les marques</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity onPress={() => navigation.navigate('Brand', { brandId: item.id })} activeOpacity={0.85}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.circle}>
              <Image source={{ uri: item.logoUrl }} style={styles.circleImg} contentFit="cover" />
            </LinearGradient>
            <Text style={styles.circleLabel} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  circleImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  circleLabel: {
    textAlign: 'center',
    width: 70,
    marginTop: 6,
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
  },
  ctaCard: {
    width: 150,
    height: 70,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  ctaText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
  },
  ctaArrow: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 4,
  },
});

export default BrandCarousel;
