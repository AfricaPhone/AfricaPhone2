// src/screens/home/PromoCardsCarousel.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { PromoCard, RootStackParamList } from '../../types';
import { useScrollCoordinator } from '../../contexts/ScrollCoordinator';

interface Props {
  promoCards: PromoCard[];
  isLoading: boolean;
}

const CARD_WIDTH = 240;

const PromoCardsCarousel: React.FC<Props> = ({ promoCards, isLoading }) => {
  const { lockParentScroll, unlockParentScroll } = useScrollCoordinator();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleCardPress = useCallback(
    (card: PromoCard) => {
      if (!card.screen) {
        return;
      }

      const routeNames = navigation.getState()?.routeNames ?? [];
      if (!routeNames.includes(card.screen)) {
        return;
      }

      if (card.screenParams) {
        navigation.navigate(card.screen, card.screenParams as never);
      } else {
        navigation.navigate(card.screen);
      }
    },
    [navigation]
  );

  const renderPromoCard = useCallback(
    ({ item, index }: { item: PromoCard; index: number }) => {
      const cardStyle = [styles.cardWrapper, index === promoCards.length - 1 && styles.cardWrapperLast];

      return (
        <TouchableOpacity style={cardStyle} onPress={() => handleCardPress(item)} activeOpacity={0.9}>
          <ImageBackground source={{ uri: item.image }} style={styles.cardImage} imageStyle={{ borderRadius: 20 }}>
            <LinearGradient colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.25)']} style={styles.promoOverlay}>
              <View>
                <Text style={styles.promoTitleLarge} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={styles.promoSubLarge} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
              <View style={styles.ctaWrapper}>
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText}>{item.cta}</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      );
    },
    [handleCardPress, promoCards.length]
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 12, height: 120 }} />;
  }

  if (!promoCards.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={promoCards}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderPromoCard}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={lockParentScroll}
        onScrollEndDrag={unlockParentScroll}
        onMomentumScrollEnd={unlockParentScroll}
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={CARD_WIDTH + 16}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardWrapperLast: {
    marginRight: 0,
  },
  cardImage: {
    width: '100%',
    height: 110,
  },
  promoOverlay: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  promoTitleLarge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    maxWidth: '90%',
  },
  promoSubLarge: {
    fontSize: 11,
    color: '#f1f5f9',
    maxWidth: '90%',
    marginTop: 2,
  },
  ctaWrapper: {
    alignItems: 'flex-start',
  },
  promoCta: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  promoCtaText: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 11,
  },
});

export default PromoCardsCarousel;
