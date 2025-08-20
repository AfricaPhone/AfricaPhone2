// src/screens/home/BrandCarousel.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Brand } from '../../types';

interface Props {
  brands: Brand[];
  isLoading: boolean;
}

const BrandCarousel: React.FC<Props> = ({ brands, isLoading }) => {
  const navigation = useNavigation<any>();

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 20, height: 98 }} />;
  }

  return (
    <FlatList
      data={brands}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.brandCarousel}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('Brand', { brandId: item.id })} activeOpacity={0.8}>
          <View style={styles.circle}>
            <Image source={{ uri: item.logoUrl }} style={styles.circleImg} />
          </View>
          <Text style={styles.circleLabel} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  brandCarousel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F2F3F5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImg: {
    width: '100%',
    height: '100%',
  },
  circleLabel: {
    textAlign: 'center',
    width: 68,
    marginTop: 6,
    fontSize: 12,
    color: '#111',
  },
});

export default BrandCarousel;
