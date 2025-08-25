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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBoutique } from '../store/BoutiqueContext'; // Importer useBoutique

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

const StoreScreen: React.FC = () => {
  const navigation = useNavigation();
  const { boutiqueInfo: info, loading } = useBoutique(); // Utiliser le hook

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

        {/* Main Info Section */}
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
            <InfoRow
              icon="phone-outline"
              label="Mobile"
              value={phoneNumber}
              onPress={() => handleCall(phoneNumber)}
              isLink
            />
          )}
          <View style={styles.divider} />
          <InfoRow
            icon="whatsapp"
            label="WhatsApp"
            value={info.whatsappNumber}
            onPress={() => handleOpenUrl(`https://wa.me/${info.whatsappNumber.replace('+', '')}`)}
            isLink
          />
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
