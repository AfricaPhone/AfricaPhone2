// src/components/ProductGridCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Product } from '../types';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatPrice';

type Props = {
  product: Product;
  promoted?: boolean;
  onPress?: () => void;
};

const ProductGridCard: React.FC<Props> = ({ product, promoted, onPress }) => {
  const { toggleFavorite, isFav } = useStore();
  const fav = isFav(product.id);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {promoted ? (
          <View style={styles.adBadge}>
            <Text style={styles.adTxt}>PUB</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(product.id)}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? '#E91E63' : '#111'} />
        </TouchableOpacity>
      </View>

      <Text numberOfLines={2} style={styles.title}>{product.title}</Text>

      <View style={styles.priceRow}>
        <Ionicons name="flash-outline" size={16} />
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  imageWrap: {
    position: 'relative',
    backgroundColor: '#F2F3F5',
  },
  image: { width: '100%', aspectRatio: 1 },
  heartBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  adBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: '#111',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { paddingHorizontal: 10, paddingTop: 8, fontSize: 13, color: '#111' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  price: { marginLeft: 6, fontSize: 15, fontWeight: '800', color: '#111' },
});

export default ProductGridCard;
