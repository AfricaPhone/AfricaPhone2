// src/screens/ProductDetailScreen.tsx
import React, { useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../store/StoreContext';
import RatingStars from '../components/RatingStars';
import { formatPrice } from '../utils/formatPrice';

const { width } = Dimensions.get('window');

type RouteParams = { productId: string };

const COLORS = [
  { key: 'black', label: 'Noir', swatch: '#111827' },
  { key: 'silver', label: 'Argent', swatch: '#d1d5db' },
  { key: 'blue', label: 'Bleu', swatch: '#3b82f6' },
];

const STORAGES = ['64 GO', '128 GO', '256 GO', '512 GO'];

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

  const { toggleFavorite, isFav, getProductById } = useStore();
  const product = getProductById(productId);

  const [color, setColor] = useState(COLORS[0].key);
  const [storage, setStorage] = useState(STORAGES[1]);
  const [headerH, setHeaderH] = useState(56);
  const onHeaderLayout = (e: LayoutChangeEvent) => setHeaderH(e.nativeEvent.layout.height);

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
  
  const handleWhatsAppPress = () => {
    if (!product) return;
    const phoneNumber = "22900000000"; // Remplacez par votre numéro WhatsApp
    const message = `Bonjour, je suis intéressé(e) par le produit : ${product.title} (${formatPrice(product.price)}).`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert("Erreur", "WhatsApp n'est pas installé sur votre appareil.");
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <Text>Produit non trouvé.</Text>
      </View>
    );
  }

  const oldPrice = product.price * 1.12;
  const rating = product.rating ?? 4.6;

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
          <View style={styles.ratingRow}>
            <RatingStars rating={rating} size={14} />
            <Text style={styles.ratingTxt}>{rating.toFixed(1)} · 530 avis</Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={styles.oldPrice}>{formatPrice(oldPrice)}</Text>
          </View>
          <View style={styles.freeDelivery}>
            <Ionicons name="car-outline" size={16} color="#111" />
            <Text style={styles.freeDeliveryTxt}>Livraison gratuite</Text>
          </View>
        </View>

        <View style={styles.optionBlock}>
          <Text style={styles.optionLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <Pressable key={c.key} onPress={() => setColor(c.key)} style={[styles.colorBtn, color === c.key && styles.colorBtnActive]}>
                <View style={[styles.swatch, { backgroundColor: c.swatch }]} />
                <Text style={[styles.colorTxt, color === c.key && styles.colorTxtActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.optionBlock}>
          <Text style={styles.optionLabel}>Stockage</Text>
          <View style={styles.pillsRow}>
            {STORAGES.map(s => {
              const active = storage === s;
              return (
                <Pressable key={s} onPress={() => setStorage(s)} style={[styles.pill, active && styles.pillActive]}>
                  <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#111" />
            <Text style={styles.infoTxt}>Livraison entre le 24 août et le 23 sept.</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#111" />
            <Text style={styles.infoTxt}>Retours sous 30 jours • Garantie 2 ans</Text>
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

        <Section title="Avis (530)">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RatingStars rating={rating} size={16} />
            <Text style={{ color: '#374151' }}>{rating.toFixed(1)} en moyenne</Text>
          </View>
          <View style={{ height: 8 }} />
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: '#6b7280' }}>L'interface des avis arrive bientôt.</Text>
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
    </View>
  );
};

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
  ratingRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  ratingTxt: { color: '#6b7280' },
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
  freeDelivery: { marginTop: 8, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  freeDeliveryTxt: { fontSize: 12, color: '#111', fontWeight: '600' },
  optionBlock: { marginTop: 14, paddingHorizontal: 16 },
  optionLabel: { fontWeight: '700', marginBottom: 8, color: '#111' },
  colorRow: { flexDirection: 'row', columnGap: 10 },
  colorBtn: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', columnGap: 8,
  },
  colorBtnActive: { borderColor: '#111' },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  colorTxt: { color: '#374151', fontWeight: '600' },
  colorTxtActive: { color: '#111' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  pillActive: { borderColor: '#111', backgroundColor: '#111' },
  pillTxt: { color: '#374151', fontWeight: '600' },
  pillTxtActive: { color: '#fff' },
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
