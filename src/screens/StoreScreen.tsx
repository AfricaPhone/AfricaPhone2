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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- Design Tokens ---
const COLORS = {
  primary: '#007AFF', // Un bleu standard pour les liens
  surface: '#f2f2f7', // Fond de l'écran (gris clair)
  background: '#ffffff', // Fond des sections
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

const StoreScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleGetDirections = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = '6.452302, 2.378749'; // Coordonnées Abomey Calavi
    const label = 'Africa Phone';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleCall = (number: string) => Linking.openURL(`tel:${number}`);
  const handleEmail = (email: string) => Linking.openURL(`mailto:${email}`);
  const handleWeb = (url: string) => Linking.openURL(url);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1556742044-5a7ed7e4a7ee?q=80&w=1600' }}
            style={styles.headerBackground}
          />
          <View style={styles.headerOverlay} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://placehold.co/100x100/FF7A00/FFFFFF?text=A' }} // Remplacez par votre vrai logo
              style={styles.logo}
            />
          </View>
        </View>

        {/* Info Header */}
        <View style={styles.infoHeader}>
          <Text style={styles.storeName}>Africa Phone</Text>
          <Text style={styles.storeCategory}>Boutique d'électronique</Text>
        </View>
        
        {/* Actions Rapides */}
        <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCall('+22954151522')}>
                <Ionicons name="call" size={22} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
                <Ionicons name="map" size={22} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Itinéraire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleWeb('https://africaphone-africaphone.web.app/')}>
                <Ionicons name="globe" size={22} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Site Web</Text>
            </TouchableOpacity>
        </View>


        {/* Main Info Section */}
        <View style={styles.section}>
          <InfoRow
            icon="map-marker-outline"
            label="Adresse"
            value="Abomey Calavi, Bénin"
            onPress={handleGetDirections}
            isLink
          />
          <View style={styles.mapPreview}>
            <Image
              source={{ uri: 'https://storage.googleapis.com/gweb-uniblog-publish-prod/images/New-pins-on-Google-Maps_1.max-1000x1000.png' }}
              style={styles.mapImage}
            />
          </View>
          <View style={styles.divider} />
          <InfoRow
            icon="clock-outline"
            label="Horaires"
            value="Ouvert 24h/24"
          />
        </View>

        <View style={styles.section}>
          <InfoRow
            icon="phone-outline"
            label="Mobile"
            value="+229 54 15 15 22"
            onPress={() => handleCall('+22954151522')}
            isLink
          />
           <View style={styles.divider} />
          <InfoRow
            icon="whatsapp"
            label="WhatsApp"
            value="Discuter avec nous"
            onPress={() => handleWeb('https://wa.me/22954151522')}
            isLink
          />
        </View>

        <View style={styles.section}>
          <InfoRow
            icon="email-outline"
            label="E-mail"
            value="africaphone24@gmail.com"
            onPress={() => handleEmail('africaphone24@gmail.com')}
            isLink
          />
          <View style={styles.divider} />
          <InfoRow
            icon="web"
            label="Site web"
            value="africaphone-africaphone.web.app"
            onPress={() => handleWeb('https://africaphone-africaphone.web.app/')}
            isLink
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  headerContainer: {
    height: 200,
    alignItems: 'center',
    position: 'relative',
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
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
    color: COLORS.primary,
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
