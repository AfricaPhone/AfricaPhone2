// src/components/ProductGridCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image'; // MODIFICATION: Importation de expo-image
import { Product } from '../types';
import { useFavorites } from '../store/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatPrice';

type Props = {
  product: Product;
  promoted?: boolean;
  onPress?: () => void;
};

const ProductGridCard: React.FC<Props> = ({ product, promoted, onPress }) => {
  const { toggleFavorite, isFav } = useFavorites();
  const fav = isFav(product.id);

  const hasSpecs = typeof product.ram === 'number' && typeof product.rom === 'number';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageWrap}>
        {/* MODIFICATION: Le placeholder est maintenant une couleur unie */}
        <Image
          style={styles.image}
          source={{ uri: product.image }}
          placeholder={'#f2f3f5'}
          contentFit="cover"
          transition={300}
        />
        {promoted ? (
          <View style={styles.adBadge}>
            <Text style={styles.adTxt}>PUB</Text>
          </View>
        ) : null}
        <TouchableOpacity testID="heart-button" style={styles.heartBtn} onPress={() => toggleFavorite(product.id)}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? '#E91E63' : '#111'} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>

        {hasSpecs && (
          <Text style={styles.specsText}>
            {product.rom}GB + {product.ram}RAM
          </Text>
        )}

        <View style={styles.priceRow}>
          <Ionicons name="flash-outline" size={16} />
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
        </View>
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
  infoContainer: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 8,
    gap: 2,
  },
  title: {
    fontSize: 13,
    color: '#111',
    minHeight: 32,
  },
  specsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  price: { marginLeft: 6, fontSize: 15, fontWeight: '800', color: '#111' },
});

export default React.memo(ProductGridCard);
