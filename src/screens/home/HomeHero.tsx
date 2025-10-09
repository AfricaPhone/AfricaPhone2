import React, { useMemo, useState } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  accentColor: string;
  gradient: string;
  image: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SLIDES: HeroSlide[] = [
  {
    id: 'focus-pro',
    title: 'Galaxy S24 Ultra',
    subtitle: 'Pré-configuration premium',
    description: 'Bénéficiez du transfert complet de données, de la pose verre trempé et d’une livraison express 24 h.',
    ctaLabel: 'Réserver avec un expert',
    accentColor: '#DB2777',
    gradient: '#f472b6',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    icon: 'sparkles-outline',
  },
  {
    id: 'trade-in',
    title: 'Switch Days AfricaPhone',
    subtitle: 'Reprise instantanée',
    description: 'Faites estimer votre smartphone en boutique et repartez avec un bonus fidélité de 20 000 FCFA.',
    ctaLabel: 'Estimer mon appareil',
    accentColor: '#2563eb',
    gradient: '#60a5fa',
    image: 'https://images.unsplash.com/photo-1580894894513-541e068a5b41?auto=format&fit=crop&w=1200&q=80',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'kkiapay',
    title: 'Financement Kkiapay',
    subtitle: 'Payez en 6 fois',
    description: 'Recevez votre accord en moins de 3 minutes et profitez de mensualités adaptées à votre budget.',
    ctaLabel: 'Démarrer une simulation',
    accentColor: '#10b981',
    gradient: '#34d399',
    image: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80',
    icon: 'cash-outline',
  },
];

const DOT_SIZE = 8;

const HomeHero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => SLIDES, []);

  return (
    <View style={styles.container}>
      <Carousel
        loop
        width={width}
        height={Math.min(width * 0.65, 360)}
        autoPlay
        autoPlayInterval={4500}
        data={slides}
        pagingEnabled
        onSnapToItem={index => setActiveIndex(index)}
        renderItem={({ item }) => (
          <HeroCard
            slide={item}
            onPress={() => {
              // Future hookup : navigate or show bottom sheet
            }}
          />
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, index) => {
          const isActive = index === activeIndex;
          return <View key={index} style={[styles.dot, isActive ? styles.dotActive : null]} />;
        })}
      </View>
    </View>
  );
};

type HeroCardProps = {
  slide: HeroSlide;
  onPress: () => void;
};

const HeroCard: React.FC<HeroCardProps> = ({ slide, onPress }) => {
  return (
    <View style={styles.cardWrapper}>
      <ImageBackground
        source={{ uri: slide.image }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageContent}
      >
        <View style={[styles.overlay, { backgroundColor: `${slide.accentColor}99` }]} />
        <View style={styles.content}>
          <View style={styles.badge}>
            <Ionicons name={slide.icon} size={16} color="#fff" />
            <Text style={styles.badgeText}>{slide.subtitle}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={[styles.cta, { backgroundColor: slide.accentColor }]}
          >
            <Text style={styles.ctaText}>{slide.ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  cardWrapper: {
    width,
    paddingHorizontal: 16,
  },
  backgroundImage: {
    height: Math.min(width * 0.65, 360),
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 28,
  },
  backgroundImageContent: {
    borderRadius: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.25)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
  },
  description: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: 'rgba(148, 163, 184, 0.5)',
  },
  dotActive: {
    backgroundColor: '#111827',
    width: DOT_SIZE * 2,
  },
  rowAction: {
    flexDirection: 'row',
  },
});

export default HomeHero;
