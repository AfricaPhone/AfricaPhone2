// src/components/ProductCarousel.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../types';
import { useProducts } from '../store/ProductContext';
import ProductGridCard from './ProductGridCard';

interface Props {
  title: string;
  productIds: string[];
}

const ProductCarousel: React.FC<Props> = ({ title, productIds }) => {
  const navigation = useNavigation<any>();
  const { getProductById } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      // Utilisation de Promise.all pour attendre toutes les promesses
      const fetchedProductsPromises = productIds.map(id => getProductById(id));
      const resolvedProducts = await Promise.all(fetchedProductsPromises);
      setProducts(resolvedProducts.filter(Boolean) as Product[]);
      setLoading(false);
    };
    fetchProducts();
  }, [productIds, getProductById]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const handlePress = () => {
        navigation.navigate('ProductDetail', { productId: item.id });
      };

      return (
        <View style={styles.cardWrapper}>
          <ProductGridCard product={item} onPress={handlePress} />
        </View>
      );
    },
    [navigation]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <ActivityIndicator color="#FF7A00" style={{ height: 180 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
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
