// src/components/ShopTheLook.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { ShopTheLookItem, Product, RootStackParamList } from '../types';
import { useProducts } from '../store/ProductContext';

interface Props {
  item: ShopTheLookItem;
}

const ShopTheLook: React.FC<Props> = ({ item }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { getProductById } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const productDetails = await Promise.all(item.markers.map(marker => getProductById(marker.productId)));
      setProducts(productDetails.filter(Boolean) as Product[]);
      setLoading(false);
    };
    fetchProducts();
  }, [item.markers, getProductById]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shoppez le Look</Text>
      <ImageBackground source={{ uri: item.imageUrl }} style={styles.image} imageStyle={{ borderRadius: 16 }}>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          item.markers.map(marker => {
            const product = products.find(p => p.id === marker.productId);
            if (!product) return null;
            return (
              <TouchableOpacity
                key={marker.productId}
                style={[styles.marker, { top: marker.top, left: marker.left }]}
                onPress={() =>
                  navigation.navigate('ProductDetail', { productId: marker.productId, product })
                }
              >
                <View style={styles.markerDot} />
              </TouchableOpacity>
            );
          })
        )}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  image: {
    height: 250,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ShopTheLook;
