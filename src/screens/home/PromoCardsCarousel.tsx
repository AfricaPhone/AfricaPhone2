// src/screens/home/PromoCardsCarousel.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { PromoCard } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  promoCards: PromoCard[];
  isLoading: boolean;
}

const PromoCardsCarousel: React.FC<Props> = ({ promoCards, isLoading }) => {
  const navigation = useNavigation<any>();

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 20, height: 140 }} />;
  }

  return (
    <FlatList
      horizontal
      data={promoCards}
      keyExtractor={item => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalCardContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.promoCardWrapper}
          onPress={() => item.screen && navigation.navigate(item.screen as never)}
          activeOpacity={0.9}
        >
          <ImageBackground source={{ uri: item.image }} style={styles.promoCardLarge} imageStyle={{ borderRadius: 20 }}>
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)']} style={styles.promoOverlay}>
              <View>
                <Text style={styles.promoTitleLarge}>{item.title}</Text>
                {item.subtitle && <Text style={styles.promoSubLarge}>{item.subtitle}</Text>}
              </View>
              <View style={styles.promoCta}>
                <Text style={styles.promoCtaText}>{item.cta}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  horizontalCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  promoCardWrapper: {
    width: screenWidth * 0.8,
  },
  promoCardLarge: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
  },
  promoOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  promoTitleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    maxWidth: '90%',
  },
  promoSubLarge: {
    fontSize: 14,
    color: '#f1f5f9',
    maxWidth: '80%',
  },
  promoCta: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  promoCtaText: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default PromoCardsCarousel;
