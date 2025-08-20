// src/components/ProductListItem.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Product } from '../types';
import { useFavorites } from '../store/FavoritesContext'; // Importer useFavorites
import { Ionicons } from '@expo/vector-icons';
import RatingStars from './RatingStars';
import { formatPrice } from '../utils/formatPrice';

type Props = {
  product: Product;
  onPress?: () => void;
};

const ProductListItem: React.FC<Props> = ({ product, onPress }) => {
  const { toggleFavorite, isFav } = useFavorites(); // Utiliser useFavorites
  const fav = isFav(product.id);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <Image source={{ uri: product.image }} style={styles.image} />
      <View style={styles.infoContainer}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        {product.rating ? (
          <View style={styles.ratingRow}>
            <RatingStars rating={product.rating} size={14} />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          </View>
        ) : null}
        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>
      <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(product.id)}>
        <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? '#E91E63' : '#111'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 10,
    alignItems: 'flex-start',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F2F3F5',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    lineHeight: 18,
  },
  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },
  heartBtn: {
    padding: 6,
  },
});

// Enveloppe le composant avec React.memo pour éviter les re-rendus inutiles
export default React.memo(ProductListItem);
