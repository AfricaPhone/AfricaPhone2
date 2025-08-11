import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscoverFeedItem } from '../types';
import { DISCOVER_FEED_DATA } from '../data/discoverFeed';

// Import all the new components
import HeroBanner from '../components/HeroBanner';
import ProductCarousel from '../components/ProductCarousel';
import ShopTheLook from '../components/ShopTheLook';
import ArticleCard from '../components/ArticleCard';
import ProductGridCard from '../components/ProductGridCard';
import { useStore } from '../store/StoreContext';
import { useNavigation } from '@react-navigation/native';

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { getProductById } = useStore();

  const renderItem = useCallback(({ item }: { item: DiscoverFeedItem }) => {
    switch (item.type) {
      case 'hero':
        return <View style={styles.heroWrapper}><HeroBanner item={item} /></View>;
      case 'collection':
        return <ProductCarousel title={item.title} productIds={item.productIds} />;
      case 'shop_the_look':
        return <ShopTheLook item={item} />;
      case 'article':
        return <ArticleCard item={item} />;
      case 'product_grid':
        return (
          <View style={styles.gridSection}>
            <Text style={styles.gridTitle}>{item.title}</Text>
            <View style={styles.gridContainer}>
              {item.productIds.map(id => {
                const product = getProductById(id);
                if (!product) return null;
                return (
                  <View key={id} style={styles.gridItem}>
                    <ProductGridCard
                      product={product}
                      onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        );
      default:
        return null;
    }
  }, [navigation, getProductById]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={DISCOVER_FEED_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Découvrir</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  listContent: {
    paddingBottom: 20,
  },
  heroWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridSection: {
    marginBottom: 16,
  },
  gridTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '48%',
    marginBottom: 12,
  },
});

export default DiscoverScreen;