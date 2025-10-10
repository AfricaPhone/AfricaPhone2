// src/components/ProductGridCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
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
  const oldPriceValue = product.oldPrice ?? Math.round(product.price * 1.12);
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

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Bonjour, je suis interesse par ${product.title}.`);
    Linking.openURL(`https://wa.me/2290154151522?text=${message}`).catch(() => undefined);
  };
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
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Text style={styles.oldPrice}>{formatPrice(oldPriceValue)}</Text>
        </View>
        <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp} activeOpacity={0.9}>
          <Ionicons name="logo-whatsapp" size={16} color="#22c55e" />
          <Text style={styles.whatsappText}>WhatsApp</Text>
        </TouchableOpacity>
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
    gap: 10,
  },
  title: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  oldPrice: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
  },
  whatsappText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default React.memo(ProductGridCard);
