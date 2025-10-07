// src/screens/CandidateProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';

type CandidateProfileScreenRouteProp = RouteProp<RootStackParamList, 'CandidateProfile'>;

const CandidateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CandidateProfileScreenRouteProp>();
  const { candidate } = route.params;

  const handleShareKit = async () => {
    try {
      // Simulation: on partage un texte. En production, on génèrerait une image.
      Alert.alert(
        'Kit de Campagne',
        'Cette fonctionnalité générera une image personnalisée avec un QR code à partager sur vos réseaux.'
      );
      await Share.share({
        message: `Soutenez-moi au concours Africaphone ! Votez pour ${candidate.name} ici : [URL_APP] #ConcoursAfricaphone`,
      });
    } catch (error) {
      console.error('Erreur de partage du kit:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Profil du Candidat
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: candidate.photoUrl }} style={styles.profilePhoto} />
          <Text style={styles.profileName}>{candidate.name}</Text>
          <Text style={styles.profileMedia}>{candidate.media}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biographie</Text>
          <Text style={styles.bioText}>
            Journaliste passionné par les nouvelles technologies et leur impact sur notre société. Actif depuis plus de
            5 ans dans le paysage médiatique béninois, spécialisé dans les tests de produits et les analyses de marché.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promouvoir ma candidature</Text>
          <TouchableOpacity style={styles.kitButton} onPress={handleShareKit}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color="#fff" />
            <Text style={styles.kitButtonText}>Obtenir mon Kit de Campagne</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 16 },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF7A00',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 16,
  },
  profileMedia: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  kitButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  kitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CandidateProfileScreen;
