// src/screens/StoreScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
  Pressable, // Ajouté pour le composant Section
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBoutique } from '../store/BoutiqueContext'; // Importer useBoutique
import { useProducts } from '../store/ProductContext';
import { Brand, RootStackParamList } from '../types';

// --- Design Tokens ---
const COLORS = {
  primary: '#000000',
  surface: '#f2f2f7',
  background: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#6e6e73',
  divider: '#e5e5ea',
};

// --- Composant pour les lignes d'information ---
const InfoRow: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  isLink?: boolean;
  onPress?: () => void;
}> = ({ icon, label, value, isLink, onPress }) => (
  <TouchableOpacity onPress={onPress} disabled={!onPress}>
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={22} color={COLORS.textSecondary} style={styles.infoIcon} />
      <View style={styles.infoTextContainer}>
        <Text style={isLink ? styles.infoValueLink : styles.infoValue}>{value}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// --- Nouveau composant Section pour la description et autres sections repliables ---
const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen }) => {
  const [open, setOpen] = React.useState(!!defaultOpen);
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

type BrandPeekCarouselProps = {
  brands: Brand[];
  onBrandPress: (brandId: string) => void;
};

const BrandPeekCarousel: React.FC<BrandPeekCarouselProps> = ({ brands, onBrandPress }) => {
  const { width } = useWindowDimensions();
  const sidePadding = 16;
  const spacing = 14;
  const peekValue = Math.max(40, width * 0.22);
  const cardWidth = Math.min(200, Math.max(150, width - sidePadding * 2 - peekValue));
  const snapInterval = cardWidth + spacing;

  const renderItem = React.useCallback(
    ({ item }: { item: Brand }) => (
      <View style={[brandCarouselStyles.itemWrapper, { width: cardWidth }]}>
        <TouchableOpacity
          style={brandCarouselStyles.card}
          onPress={() => onBrandPress(item.id)}
          activeOpacity={0.88}
        >
          <View style={brandCarouselStyles.logoRing}>
            {item.logoUrl ? (
              <Image source={{ uri: item.logoUrl }} style={brandCarouselStyles.logo} resizeMode="contain" />
            ) : (
              <Text style={brandCarouselStyles.logoFallback}>{item.name.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={brandCarouselStyles.brandName} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [cardWidth, onBrandPress]
  );

  return (
    <View style={brandCarouselStyles.container}>
      <FlatList
        horizontal
        data={brands}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          brandCarouselStyles.listContent,
          { paddingLeft: sidePadding, paddingRight: Math.max(sidePadding, peekValue) },
        ]}
        ItemSeparatorComponent={() => <View style={{ width: spacing }} />}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapInterval}
        bounces={false}
        nestedScrollEnabled
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', COLORS.background]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={brandCarouselStyles.fadeOverlay}
      />
    </View>
  );
};

const brandCarouselStyles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingBottom: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  itemWrapper: {
    height: 130,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  logoFallback: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: '100%',
    textAlign: 'center',
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 60,
  },
});

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { boutiqueInfo: info, loading } = useBoutique(); // Utiliser le hook
  const { brands, brandsLoading } = useProducts();

  const displayedBrands = React.useMemo(() => brands.slice(0, 12), [brands]);
  const brandPreviewText = React.useMemo(() => {
    if (!displayedBrands.length) {
      return null;
    }
    const names = displayedBrands
      .slice(0, 4)
      .map(brand => brand.name)
      .filter(Boolean);
    if (!names.length) {
      return null;
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} et ${names[1]}`;
    }
    const last = names.pop();
    return `${names.join(', ')} et ${last}`;
  }, [displayedBrands]);
  const shouldShowBrandSection = brandsLoading || displayedBrands.length > 0;

  const handleBrandPress = React.useCallback(
    (brandId: string) => {
      if (!brandId) {
        return;
      }
      navigation.navigate('Brand', { brandId });
    },
    [navigation]
  );

  const handleOpenUrl = (url: string | undefined) => {
    if (!url) return;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erreur', `Impossible d'ouvrir cette URL: ${url}`);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  const handleCall = (number: string | undefined) => {
    if (!number) return;
    handleOpenUrl(`tel:${number}`);
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  if (!info) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerScreen}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { top: 60, backgroundColor: 'rgba(0,0,0,0.1)' }]}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text>Informations non disponibles.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const phoneNumber = info.phoneNumber || info.whatsappNumber;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: info.coverImageUrl || 'https://placehold.co/600x400/cccccc/ffffff?text=Image' }}
            style={styles.headerBackground}
          />
          <View style={styles.headerOverlay} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: info.profileImageUrl || 'https://placehold.co/100x100/FF7A00/FFFFFF?text=A' }}
              style={styles.logo}
            />
          </View>
        </View>

        {/* Info Header */}
        <View style={styles.infoHeader}>
          <Text style={styles.storeName}>{info.name || 'Nom de la boutique'}</Text>
          <Text style={styles.storeCategory}>{info.category || "Boutique d'électronique"}</Text>
        </View>

        {/* Actions Rapides */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(phoneNumber)}>
            <Ionicons name="call" size={22} color={COLORS.textPrimary} />
            <Text style={styles.actionButtonText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenUrl(info.googleMapsUrl)}>
            <Ionicons name="map" size={22} color={COLORS.textPrimary} />
            <Text style={styles.actionButtonText}>Itinéraire</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenUrl(info.websiteUrl)}>
            <Ionicons name="globe" size={22} color={COLORS.textPrimary} />
            <Text style={styles.actionButtonText}>Site Web</Text>
          </TouchableOpacity>
        </View>

        {shouldShowBrandSection ? (
          <View style={styles.brandSection}>
            <Text style={styles.brandSectionTitle}>Marques de téléphones</Text>
            {!brandsLoading && brandPreviewText ? (
              <Text style={styles.brandSectionSubtitle}>{brandPreviewText} et plus encore.</Text>
            ) : null}
            {brandsLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.brandLoader} />
            ) : (
              <View style={styles.brandCarouselWrapper}>
                <BrandPeekCarousel brands={displayedBrands} onBrandPress={handleBrandPress} />
              </View>
            )}
          </View>
        ) : null}

        {/* Section Description */}
        {info.description && (
          <Section title="À propos de nous" defaultOpen>
            <Text style={styles.bodyTxt}>{info.description}</Text>
          </Section>
        )}

        {/* Main Info Section (anciennement la seule section d'infos) */}
        <View style={styles.section}>
          <InfoRow
            icon="map-marker-outline"
            label="Adresse"
            value={info.address || 'Adresse non disponible'}
            onPress={() => handleOpenUrl(info.googleMapsUrl)}
            isLink={!!info.googleMapsUrl}
          />
          <View style={styles.divider} />
          <InfoRow icon="clock-outline" label="Horaires" value={info.openingHours || 'Non spécifiés'} />
        </View>

        <View style={styles.section}>
          {phoneNumber && (
            <>
              <InfoRow
                icon="phone-outline"
                label="Mobile"
                value={phoneNumber}
                onPress={() => handleCall(phoneNumber)}
                isLink
              />
              <View style={styles.divider} />
            </>
          )}
          {info.whatsappNumber && ( // S'assurer que WhatsApp est toujours affiché s'il existe
            <InfoRow
              icon="whatsapp"
              label="WhatsApp"
              value={info.whatsappNumber}
              onPress={() => handleOpenUrl(`https://wa.me/${info.whatsappNumber.replace('+', '')}`)}
              isLink
            />
          )}
        </View>

        <View style={styles.section}>
          {info.email && (
            <>
              <InfoRow
                icon="email-outline"
                label="E-mail"
                value={info.email}
                onPress={() => handleOpenUrl(`mailto:${info.email}`)}
                isLink
              />
              <View style={styles.divider} />
            </>
          )}
          {info.websiteUrl && (
            <InfoRow
              icon="web"
              label="Site web"
              value={info.websiteUrl.replace('https://', '').replace('http://', '')}
              onPress={() => handleOpenUrl(info.websiteUrl)}
              isLink
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ... le reste des styles reste inchangé
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  headerContainer: {
    height: 200,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: COLORS.divider,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.surface,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  infoHeader: {
    marginTop: 60, // 50 (logo radius) + 10 margin
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  storeCategory: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  brandSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  brandSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
  },
  brandSectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  brandCarouselWrapper: {
    marginTop: 14,
  },
  brandLoader: {
    paddingVertical: 24,
    alignSelf: 'center',
  },
  // Styles pour les sections repliables
  section: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1, // Ajout d'une bordure pour correspondre au style des autres sections
    borderColor: COLORS.divider, // Couleur de la bordure
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background, // Assure que l'en-tête a un fond blanc
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1, // Séparateur pour le contenu
    borderTopColor: COLORS.divider,
  },
  bodyTxt: {
    // Style pour le texte de la description
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 4,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  infoValueLink: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 54, // Aligns with text
  },
  mapPreview: {
    height: 150,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
});

export default StoreScreen;
