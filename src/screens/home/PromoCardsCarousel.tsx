// src/screens/home/PromoCardsCarousel.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PromoCard, RootStackParamList } from '../../types';
import { useScrollCoordinator } from '../../contexts/ScrollCoordinator';

interface Props {
  promoCards: PromoCard[];
  isLoading: boolean;
}

const CARD_WIDTH = 260;
const CARD_GAP = 16;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<PromoCard>);

const PromoCardsCarousel: React.FC<Props> = ({ promoCards, isLoading }) => {
  const { lockParentScroll, unlockParentScroll } = useScrollCoordinator();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const data = useMemo(() => promoCards, [promoCards]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
      setActiveIndex(index);
      unlockParentScroll();
    },
    [unlockParentScroll]
  );

  const handleCardPress = useCallback(
    (card: PromoCard) => {
      if (!card.screen) {
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
      const inputRange = [
        (index - 1) * (CARD_WIDTH + CARD_GAP),
        index * (CARD_WIDTH + CARD_GAP),
        (index + 1) * (CARD_WIDTH + CARD_GAP),
      ];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.94, 1, 0.94],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
          <TouchableOpacity onPress={() => handleCardPress(item)} activeOpacity={0.9}>
            <ImageBackground source={{ uri: item.image }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
              <LinearGradient colors={['rgba(15,23,42,0.75)', 'rgba(15,23,42,0.2)']} style={styles.overlay}>
                <View style={styles.cardContent}>
                  <View style={{ gap: 4 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.ctaRow}>
                    <View style={styles.ctaPill}>
                      <Text style={styles.ctaText}>{item.cta}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#0f172a" />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [handleCardPress, scrollX]
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 12, height: 120 }} />;
  }

  if (!data.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderPromoCard}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={lockParentScroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onScrollEndDrag={unlockParentScroll}
        onMomentumScrollBegin={lockParentScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        bounces={false}
      />
      <View style={styles.dotsRow}>
        {data.map((_, index) => {
          const isActive = index === activeIndex;
          return <View key={index} style={[styles.dot, isActive && styles.dotActive]} />;
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardImageRadius: {
    borderRadius: 24,
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#e2e8f0',
  },
  ctaRow: {
    alignItems: 'flex-start',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.4)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#0f172a',
  },
});

export default PromoCardsCarousel;
