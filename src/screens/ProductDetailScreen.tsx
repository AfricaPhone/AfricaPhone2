// src/screens/ProductDetailScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { useFavorites } from '../store/FavoritesContext';
import { useProducts } from '../store/ProductContext';
import { useBoutique } from '../store/BoutiqueContext';
import { formatPrice } from '../utils/formatPrice';
import { Product, RootStackParamList, Specification, BoutiqueInfo } from '../types';

import PromoCodeModal from '../components/PromoCodeModal';

const functions = getFunctions();

const { width: screenWidth } = Dimensions.get('window');

const ITEM_WIDTH = screenWidth;
const SPACING = 0;
const SIDE_SPACING = 0;

type ValidatedPromo = {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
};

type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = NavigationProp<RootStackParamList>;

// --- Composants pour les onglets ---
const SpecificationsTab: React.FC<{ product: Product }> = ({ product }) => {
  const hasSpecifications = product.specifications && product.specifications.length > 0;
  return (
    <ScrollView style={styles.tabContentContainer}>
      {/* Spécifications principales (ROM/RAM) */}
      {product.ram && product.rom && (
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Capacité</Text>
          <Text style={styles.specVal}>
            {product.rom}GB ROM / {product.ram}GB RAM
          </Text>
        </View>
      )}

      {/* Bloc d'informations pratiques */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#111" />
          <Text style={styles.infoTxt}>Nous livrons partout au Bénin !</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="shield-check-outline" size={20} color="#111" />
          <Text style={styles.infoTxt}>Retours sous 30 jours • Garantie 1 an</Text>
        </View>
      </View>

      {/* Liste des spécifications détaillées */}
      {hasSpecifications ? (
        product.specifications?.map((spec, index) => (
          <View key={index} style={styles.specRow}>
            <Text style={styles.specKey}>{spec.key}</Text>
            <Text style={styles.specVal}>{spec.value}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyTabContainer}>
          <Text style={styles.emptyTabText}>Aucune spécification détaillée disponible.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const DescriptionTab: React.FC<{ description?: string }> = ({ description }) => (
  <ScrollView style={styles.tabContentContainer}>
    <Text style={styles.bodyTxt}>
      {description ||
        'Appareil haute performance avec une construction premium, une excellente autonomie et un écran brillant. Idéal pour la photographie, les jeux et un usage quotidien.'}
    </Text>
  </ScrollView>
);

const Tab = createMaterialTopTabNavigator();

const ProductDetailScreen: React.FC = () => {
  const nav = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  const { productId } = route.params;

  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFav } = useFavorites();
  const { getProductById, getProductFromCache } = useProducts();
  const { boutiqueInfo } = useBoutique();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState<ValidatedPromo | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isShareable, setIsShareable] = useState(false);
  const shareableImageUri = useRef<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const cachedProduct = getProductFromCache(productId);
      if (cachedProduct) {
        setProduct(cachedProduct);
      }

      const freshProduct = await getProductById(productId);
      if (freshProduct) {
        setProduct(freshProduct);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId, getProductById, getProductFromCache]);

  const gallery = useMemo(() => {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    if (product?.image) {
      return [product.image];
    }
    return [];
  }, [product]);

  useEffect(() => {
    const cacheShareImage = async () => {
      if (gallery.length > 0) {
        const imageUrl = gallery[0];
        const localUri = FileSystem.cacheDirectory + `${productId}-share-image.jpg`;
        shareableImageUri.current = localUri;

        try {
          const fileInfo = await FileSystem.getInfoAsync(localUri);
          if (!fileInfo.exists) {
            await FileSystem.downloadAsync(imageUrl, localUri);
          }
          setIsShareable(true);
        } catch (e) {
          console.error("Erreur de pré-chargement de l'image:", e);
          setIsShareable(false);
        }
      }
    };

    if (product) {
      cacheShareImage();
    }
  }, [product, gallery, productId]);

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / ITEM_WIDTH);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const handleWhatsAppPress = async () => {
    if (!product || !boutiqueInfo?.whatsappNumber) {
      Alert.alert('Erreur', "Le numéro de contact n'est pas disponible pour le moment.");
      return;
    }
    const phoneNumber = boutiqueInfo.whatsappNumber;
    let message = `Bonjour, je suis intéressé(e) par le produit : ${product.title} (${formatPrice(product.price)}).`;

    if (promoCode) {
      message += `\nMon code promo est : ${promoCode.code}`;
    }

    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. L'application est-elle bien installée sur votre appareil ?");
    }
  };

  const handleSharePress = async () => {
    if (!isShareable || !shareableImageUri.current) {
      Alert.alert('Partage impossible', "L'image n'est pas encore prête, veuillez patienter un instant.");
      return;
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Erreur', "Le partage de fichiers n'est pas disponible sur cet appareil.");
        return;
      }

      await Sharing.shareAsync(shareableImageUri.current, {
        dialogTitle: product?.title || 'Super produit !',
        mimeType: 'image/jpeg',
      });
    } catch (error: unknown) {
      console.error('Erreur de partage détaillée:', error);
      Alert.alert('Erreur', 'Impossible de partager le produit. Veuillez réessayer.');
    }
  };

  const handleApplyPromoCode = async (code: string) => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code promo.');
      return;
    }
    setIsApplyingPromo(true);
    try {
      const validateFn = httpsCallable(functions, 'validatePromoCode');
      const result = await validateFn({ code: code.trim() });
      const data = result.data as ValidatedPromo;

      setPromoCode(data);
      setIsPromoModalVisible(false);
      Alert.alert('Succès', `Le code "${data.code}" a été appliqué !`);
    } catch (error: unknown) {
      console.error('Erreur de validation du code promo: ', error);
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      Alert.alert('Erreur', message);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7A00" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <Text>Produit non trouvé.</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginTop: 20 }}>
          <Text>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const oldPrice = product.price * 1.12;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.hIconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => toggleFavorite(product.id)} style={styles.hIconBtn}>
            <Ionicons
              name={isFav(product.id) ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav(product.id) ? '#e91e63' : '#111'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.hIconBtn} onPress={handleSharePress} disabled={!isShareable}>
            <MaterialCommunityIcons name="share-variant" size={22} color={isShareable ? '#111' : '#cccccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <View style={styles.carouselContainer}>
          <FlatList
            ref={listRef}
            data={gallery}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
            renderItem={({ item }) => (
              <View style={styles.imageCard}>
                <Image
                  source={{ uri: item }}
                  style={styles.hero}
                  placeholder={'#f2f3f5'}
                  contentFit="contain"
                  transition={500}
                />
              </View>
            )}
          />
          <View style={styles.galleryTopOver}>
            {gallery.length > 1 && (
              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>
                  {activeIndex + 1} / {gallery.length}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceSection}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              <Text style={styles.oldPrice}>{formatPrice(oldPrice)}</Text>
            </View>
            {promoCode && (
              <View style={styles.promoChip}>
                <Text style={styles.promoChipText}>Code: {promoCode.code}</Text>
                <TouchableOpacity onPress={() => setPromoCode(null)}>
                  <Ionicons name="close-circle-outline" size={18} color="#007BFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.promoButton} onPress={() => setIsPromoModalVisible(true)}>
            <Text style={styles.promoButtonText}>Code Promo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <Tab.Navigator
            screenOptions={{
              tabBarActiveTintColor: '#111',
              tabBarInactiveTintColor: '#6b7280',
              tabBarLabelStyle: { fontWeight: 'bold', textTransform: 'none' },
              tabBarIndicatorStyle: { backgroundColor: '#111', height: 2 },
              tabBarStyle: {
                backgroundColor: '#fff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#f0f0f0',
              },
            }}
          >
            <Tab.Screen name="Spécifications">{() => <SpecificationsTab product={product} />}</Tab.Screen>
            <Tab.Screen name="Description">{() => <DescriptionTab description={product.description} />}</Tab.Screen>
          </Tab.Navigator>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.actionsSafe}>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleWhatsAppPress} style={styles.whatsappBtn}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text style={styles.whatsappBtnText}>Commander via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <PromoCodeModal
        visible={isPromoModalVisible}
        onClose={() => setIsPromoModalVisible(false)}
        onApply={handleApplyPromoCode}
        isLoading={isApplyingPromo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  hIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  carouselContainer: {
    height: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    backgroundColor: '#fff',
    marginHorizontal: SPACING / 2,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  galleryTopOver: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
  },
  pageIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pageIndicatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  priceCard: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceSection: {
    flex: 1,
  },
  price: { fontSize: 22, fontWeight: '900', color: '#111' },
  oldPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  infoCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    rowGap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  infoTxt: { color: '#111' },
  tabContainer: {
    marginTop: 16,
    minHeight: 350,
  },
  tabContentContainer: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  emptyTabContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTabText: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  bodyTxt: { color: '#374151', lineHeight: 22, fontSize: 15 },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  specKey: { color: '#6b7280', fontSize: 14 },
  specVal: { color: '#111', fontWeight: '600', fontSize: 14, maxWidth: '60%', textAlign: 'right' },
  promoButton: {
    backgroundColor: '#111', // Fond noir
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 14,
    fontWeight: 'bold',
  },
  promoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    borderColor: '#007BFF',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  promoChipText: {
    color: '#007BFF',
    fontWeight: '600',
    fontSize: 12,
  },
  actionsSafe: {
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  whatsappBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ProductDetailScreen;