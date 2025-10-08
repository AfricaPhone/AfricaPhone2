// src/screens/PredictionRulesScreen.tsx
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

const PredictionRulesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Règles du jeu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="text-box-check-outline" size={20} color="#FF7A00" />
            <Text style={styles.cardTitle}>Comment participer</Text>
          </View>
          <Text style={styles.paragraph}>
            1. Partagez l&apos;application AfricaPhone sur WhatsApp pour débloquer le jeu (2 partages requis).
          </Text>
          <Text style={styles.paragraph}>2. Ouvrez la page du match et appuyez sur « Placer mon Pronostic ».</Text>
          <Text style={styles.paragraph}>
            3. Renseignez vos informations de contact (Nom, Prénom, WhatsApp) puis entrez le score exact.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#1d4ed8" />
            <Text style={styles.cardTitle}>Délais et modifications</Text>
          </View>
          <Text style={styles.paragraph}>- Les pronostics se ferment juste avant le début du match.</Text>
          <Text style={styles.paragraph}>- Une fois enregistré, votre pronostic ne peut plus être modifié.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color="#FF7A00" />
            <Text style={styles.cardTitle}>Gagnants</Text>
          </View>
          <Text style={styles.paragraph}>
            - Les joueurs qui trouvent le score exact sont déclarés gagnants pour ce match.
          </Text>
          <Text style={styles.paragraph}>
            - Les gagnants seront contactés pour la suite ou les éventuelles récompenses.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#1f2937" />
            <Text style={styles.cardTitle}>Bon à savoir</Text>
          </View>
          <Text style={styles.paragraph}>- Un seul pronostic par utilisateur et par match.</Text>
          <Text style={styles.paragraph}>
            - En cas de souci, contactez l&apos;équipe AfricaPhone via WhatsApp depuis l&apos;application.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#111', fontSize: 20, fontWeight: 'bold' },
  scrollContent: {
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: '#111', fontSize: 16, fontWeight: '700' },
  paragraph: { color: '#4b5563', fontSize: 14, lineHeight: 20, marginTop: 6 },
});

export default PredictionRulesScreen;
