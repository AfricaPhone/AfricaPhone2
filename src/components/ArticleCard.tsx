import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ArticleItem } from '../types';

interface Props {
  item: ArticleItem;
}

const ArticleCard: React.FC<Props> = ({ item }) => {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.excerpt}>{item.excerpt}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    height: 150,
    width: '100%',
  },
  textContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  excerpt: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
});

export default React.memo(ArticleCard);