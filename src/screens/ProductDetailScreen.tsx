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
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useFavorites } from '../store/FavoritesContext';
import { useProducts } from '../store/ProductContext';
import { useBoutique } from '../store/BoutiqueContext'; // Importer useBoutique
import { formatPrice } from '../utils/formatPrice';
import { Product } from '../types';

const { width } = Dimensions.get('window');

type RouteParams = { productId: string };

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
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { productId } = route.params as RouteParams;

  const { toggleFavorite, isFav } = useFavorites();
  const { getProductById, getProductFromCache } = useProducts();
  const { boutiqueInfo } = useBoutique(); // Utiliser le hook
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [headerH, setHeaderH] = useState(56);
  const onHeaderLayout = (e: LayoutChangeEvent) => setHeaderH(e.nativeEvent.layout.height);

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
      if (loading) {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, getProductById, getProductFromCache]);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    return [product.image, product.image + '&1', product.image + '&2'];
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    if (idx !== activeIndex) setActiveIndex(idx);
  };
  
  const handleWhatsAppPress = async () => {
    if (!product || !boutiqueInfo?.whatsappNumber) {
      Alert.alert("Erreur", "Le numéro de contact n'est pas disponible pour le moment.");
      return;
    }
    const phoneNumber = boutiqueInfo.whatsappNumber;
    const message = `Bonjour, je suis intéressé(e) par le produit : ${product.title} (${formatPrice(product.price)}).`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp. L'application est-elle bien installée sur votre appareil ?");
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
        <TouchableOpacity onPress={() => nav.goBack()} style={{marginTop: 20}}>
            <Text>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const oldPrice = product.price * 1.12;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header} onLayout={onHeaderLayout}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.hIconBtn} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerH, paddingBottom: 112 }}
      >
        <View>
          <FlatList
            ref={listRef}
            data={gallery}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.hero} />}
          />
          <View style={styles.galleryTopOver}>
            <View style={styles.discount}>
              <LinearGradient colors={['#ff6b6b', '#ff8e53']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.discountGrad}>
                <Text style={styles.discountTxt}>-15%</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.dots}>
            {gallery.map((_, i) => (
              <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.title}</Text>
            <View style={styles.titleActions}>
              <TouchableOpacity onPress={() => toggleFavorite(product.id)} style={styles.hIconBtn}>
                <Ionicons name={isFav(product.id) ? 'heart' : 'heart-outline'} size={22} color={isFav(product.id) ? '#e91e63' : '#111'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hIconBtn}>
                <Ionicons name="share-outline" size={22} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
          <View style={styles.specRow}><Text style={styles.specKey}>Écran</Text><Text style={styles.specVal}>6.1" OLED 120Hz</Text></View>
          <View style={styles.specRow}><Text style={styles.specKey}>Puce</Text><Text style={styles.specVal}>A-Series / Tensor</Text></View>
          <View style={styles.specRow}><Text style={styles.specKey}>Caméra</Text><Text style={styles.specVal}>Dual 12MP</Text></View>
          <View style={styles.specRow}><Text style={styles.specKey}>Batterie</Text><Text style={styles.specVal}>~4500 mAh</Text></View>
          <View style={styles.specRow}><Text style={styles.specKey}>Connectivité</Text><Text style={styles.specVal}>5G • Wi-Fi 6 • NFC</Text></View>
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
    </View>
  );
};

// ... le reste des styles reste inchangé
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  hero: { width, height: width, backgroundColor: '#f2f3f5' },
  galleryTopOver: { position: 'absolute', left: 0, right: 0, top: 0, height: 0 },
  discount: { position: 'absolute', left: 12, top: 12, borderRadius: 6, overflow: 'hidden' },
  discountGrad: { paddingHorizontal: 10, paddingVertical: 6 },
  discountTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(17,17,17,0.25)' },
  dotActive: { backgroundColor: '#111' },
  titleWrap: { paddingHorizontal: 16, paddingTop: 12, rowGap: 8 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  priceCard: {
    marginTop: 10,
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
  section: { marginTop: 14, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  sectionHeader: {
    paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
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
  actionsSafe: { backgroundColor: '#fff' },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  whatsappBtn: {
    backgroundColor: '#111',
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