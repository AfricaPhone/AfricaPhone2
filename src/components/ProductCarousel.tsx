import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../types';
import { useStore } from '../store/StoreContext';
import ProductGridCard from './ProductGridCard';

interface Props {
  title: string;
  productIds: string[];
}

const ProductCarousel: React.FC<Props> = ({ title, productIds }) => {
  const navigation = useNavigation<any>();
  const { getProductById } = useStore();
  const products = productIds.map(getProductById).filter(Boolean) as Product[];

  const renderItem = useCallback(({ item }: { item: Product }) => {
    const handlePress = () => {
      navigation.navigate('ProductDetail', { productId: item.id });
    };

    return (
      <View style={styles.cardWrapper}>
        <ProductGridCard
          product={item}
          onPress={handlePress}
        />
      </View>
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: 160,
    marginRight: 12,
  },
});

export default ProductCarousel;