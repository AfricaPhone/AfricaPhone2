// src/components/ShopTheLook.tsx
import React from 'react';
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShopTheLookItem } from '../types';
import { useProducts } from '../store/ProductContext'; // Remplacer useStore par useProducts
import { Ionicons } from '@expo/vector-icons';

interface Props {
  item: ShopTheLookItem;
}

const ShopTheLook: React.FC<Props> = ({ item }) => {
  const navigation = useNavigation<any>();
  const { getProductById } = useProducts(); // Utiliser le hook correct

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shoppez le Look</Text>
      <ImageBackground source={{ uri: item.imageUrl }} style={styles.image} imageStyle={{ borderRadius: 16 }}>
        {item.markers.map((marker) => {
          const product = getProductById(marker.productId);
          if (!product) return null;
          return (
            <TouchableOpacity
              key={marker.productId}
              style={[styles.marker, { top: marker.top, left: marker.left }]}
              onPress={() => navigation.navigate('ProductDetail', { productId: marker.productId })}
            >
              <View style={styles.markerDot} />
            </TouchableOpacity>
          );
        })}
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
