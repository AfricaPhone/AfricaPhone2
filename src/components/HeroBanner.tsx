import React from 'react';
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity } from 'react-native';
import { HeroItem } from '../types';

interface Props {
  item: HeroItem;
}

const HeroBanner: React.FC<Props> = ({ item }) => {
  return (
    <ImageBackground source={{ uri: item.imageUrl }} style={styles.container} imageStyle={styles.image}>
      <View style={styles.overlay} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <TouchableOpacity style={styles.ctaButton}>
        <Text style={styles.ctaText}>{item.cta}</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  image: {
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaButton: {
    marginTop: 16,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
  },
  ctaText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HeroBanner;
