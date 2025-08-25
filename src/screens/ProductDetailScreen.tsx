// src/screens/ProductDetailScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useFavorites } from '../store/FavoritesContext';
import { useProducts } from '../store/ProductContext';
import { useBoutique } from '../store/BoutiqueContext';
import { formatPrice } from '../utils/formatPrice';
import { Product, RootStackParamList } from '../types';

const { width: screenWidth } = Dimensions.get('window');

// --- MODIFICATION: CONSTANTES POUR LE CARROUSEL PLEINE LARGEUR ---
const ITEM_WIDTH = screenWidth; // L'image prend toute la largeur
const SPACING = 0; // Plus d'espacement entre les images
const SIDE_SPACING = 0; // Plus de marges latérales

// On définit le type des paramètres de la route
type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

// On définit le type pour la navigation
type ProductDetailScreenNavigationProp = NavigationProp<RootStackParamList>;

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(v => !v)}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

const ProductDetailScreen: React.FC = () => {
  // CORRECTION: On utilise les types pour supprimer les 'any'
  const nav = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  const { productId } = route.params;

  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFav } = useFavorites();
  const { getProductById, getProductFromCache } = useProducts();
  const { boutiqueInfo } = useBoutique();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      const cachedProduct = getProductFromCache(productId);
      if (cachedProduct) {
        setProduct(cachedProduct);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const freshProduct = await getProductById(productId);
      if (freshProduct) {
        setProduct(freshProduct);
      }
      // CORRECTION: Ajout de la dépendance 'loading'
      if (loading) {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, getProductById, getProductFromCache, loading]);

  const gallery = useMemo(() => {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    if (product?.image) {
      return [product.image];
    }
    return [];
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / ITEM_WIDTH); // MODIFICATION: Le calcul de l'index est simplifié
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const handleWhatsAppPress = async () => {
    if (!product || !boutiqueInfo?.whatsappNumber) {
      Alert.alert('Erreur', "Le numéro de contact n'est pas disponible pour le moment.");
      return;
    }
    const phoneNumber = boutiqueInfo.whatsappNumber;
    const message = `Bonjour, je suis intéressé(e) par le produit : ${product.title} (${formatPrice(product.price)}).`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. L'application est-elle bien installée sur votre appareil ?");
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
          {/* MODIFICATION: Le bouton favori est retiré du header */}
          <TouchableOpacity style={styles.hIconBtn}>
            <Ionicons name="share-outline" size={22} color="#111" />
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
            snapToInterval={ITEM_WIDTH} // MODIFICATION: snapToInterval ajusté
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
            renderItem={({ item }) => (
              <View style={styles.imageCard}>
                <Image source={{ uri: item }} style={styles.hero} />
              </View>
            )}
          />
          <View style={styles.galleryTopOver}>
            <View style={styles.discount}>
              <LinearGradient
                colors={['#ff6b6b', '#ff8e53']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.discountGrad}
              >
                <Text style={styles.discountTxt}>-15%</Text>
              </LinearGradient>
            </View>
            {/* MODIFICATION: Indicateur de page en texte */}
            {gallery.length > 1 && (
              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>
                  {activeIndex + 1} / {gallery.length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* MODIFICATION: Bouton favori déplacé ici */}
        <TouchableOpacity onPress={() => toggleFavorite(product.id)} style={styles.favButton}>
          <Ionicons
            name={isFav(product.id) ? 'heart' : 'heart-outline'}
            size={26}
            color={isFav(product.id) ? '#e91e63' : '#111'}
          />
        </TouchableOpacity>

        <View style={styles.priceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={styles.oldPrice}>{formatPrice(oldPrice)}</Text>
          </View>
          {product.ram && product.rom && (
            <Text style={styles.specsText}>
              {product.rom}GB ROM / {product.ram}GB RAM
            </Text>
          )}
        </View>

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

        <Section title="Description" defaultOpen>
          <Text style={styles.bodyTxt}>
            {product.description ??
              'Appareil haute performance avec une construction premium, une excellente autonomie et un écran brillant. Idéal pour la photographie, les jeux et un usage quotidien.'}
          </Text>
        </Section>

        <Section title="Spécifications">
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Écran</Text>
            <Text style={styles.specVal}>6.1" OLED 120Hz</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Puce</Text>
            <Text style={styles.specVal}>A-Series / Tensor</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Caméra</Text>
            <Text style={styles.specVal}>Dual 12MP</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Batterie</Text>
            <Text style={styles.specVal}>~4500 mAh</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Connectivité</Text>
            <Text style={styles.specVal}>5G • Wi-Fi 6 • NFC</Text>
          </View>
        </Section>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.actionsSafe}>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleWhatsAppPress} style={styles.whatsappBtn}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text style={styles.whatsappBtnText}>Commander via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    height: screenWidth, // MODIFICATION: Hauteur ajustée
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    backgroundColor: '#f2f3f5',
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
    height: 'auto', // Ajusté pour le positionnement relatif
    flexDirection: 'row', // Permet d'aligner les enfants
    justifyContent: 'space-between', // Pousse les éléments aux extrémités
    padding: 12,
  },
  discount: {
    borderRadius: 6,
    overflow: 'hidden',
    alignSelf: 'flex-start', // S'assure qu'il ne prend pas toute la hauteur
  },
  discountGrad: { paddingHorizontal: 10, paddingVertical: 6 },
  discountTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  // MODIFICATION: Styles pour le nouvel indicateur de page
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
  // MODIFICATION: Styles pour le bouton favori déplacé
  favButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 24,
    marginTop: -26, // La moitié de la hauteur pour le faire flotter
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  priceCard: {
    marginTop: 16, // Augmenté pour laisser de la place au bouton flottant
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  price: { fontSize: 22, fontWeight: '900', color: '#111' },
  oldPrice: { fontSize: 14, color: '#9ca3af', textDecorationLine: 'line-through' },
  specsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    rowGap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  infoTxt: { color: '#111' },
  section: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontWeight: '800', color: '#111' },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12 },
  bodyTxt: { color: '#374151', lineHeight: 20 },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  specKey: { color: '#6b7280' },
  specVal: { color: '#111', fontWeight: '600' },
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
