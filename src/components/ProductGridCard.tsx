// src/components/ProductGridCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { useFavorites } from '../store/FavoritesContext';
import { formatPrice } from '../utils/formatPrice';

type Props = {
  product: Product;
  promoted?: boolean;
  onPress?: () => void;
};

const ProductGridCard: React.FC<Props> = ({ product, promoted, onPress }) => {
  const { toggleFavorite, isFav } = useFavorites();
  const isFavorite = isFav(product.id);
  const hasSpecs = typeof product.ram === 'number' && typeof product.rom === 'number';

  const badges = useMemo(() => {
    const list: Array<{ label: string; style: object }> = [];
    if (product.isVedette) {
      list.push({ label: 'Vedette', style: styles.badgeStar });
    }
    if (product.enPromotion) {
      list.push({ label: 'Promo', style: styles.badgePromo });
    }
    if (promoted) {
      list.push({ label: 'Sponsorisé', style: styles.badgeAd });
    }
    return list;
  }, [product.isVedette, product.enPromotion, promoted]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image
            style={styles.image}
            source={{ uri: product.image }}
            placeholder={product.enPromotion ? '#fee2e2' : '#1e293b'}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={26} color="#cbd5f5" />
          </View>
        )}
        <View style={styles.badgesRow}>
          {badges.map(badge => (
            <View key={badge.label} style={[styles.badgeBase, badge.style]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          testID="heart-button"
          style={styles.heartBtn}
          onPress={() => toggleFavorite(product.id)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? '#e11d48' : '#0f172a'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>

        {hasSpecs ? (
          <Text style={styles.specsText}>
            {product.rom} Go · {product.ram} Go RAM
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          {product.enPromotion ? <Ionicons name="flash-outline" size={14} color="#f97316" /> : null}
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
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  imageWrap: {
    position: 'relative',
    backgroundColor: '#0b1324',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1324',
  },
  heartBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  badgesRow: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    gap: 6,
  },
  badgeBase: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  badgeStar: {
    backgroundColor: '#fde68a',
  },
  badgePromo: {
    backgroundColor: '#fee2e2',
  },
  badgeAd: {
    backgroundColor: '#e2e8f0',
  },
  infoContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
    gap: 6,
  },
  title: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  specsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
});

export default React.memo(ProductGridCard);
