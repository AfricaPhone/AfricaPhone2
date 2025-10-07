// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/StoreContext';
import ProfileListItem from '../components/ProfileListItem';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserContest } from '../types';

// Données simulées pour les badges
const mockParticipatedContests: UserContest[] = [
  {
    contestId: 'journalistes-tech-2025',
    contestName: 'Trophée du Journaliste Tech 2025',
    badgeIcon: 'seal',
  },
];

const ProfileScreen: React.FC = () => {
  const { user, logout } = useStore();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState(true);

  const GuestView = () => (
    <View style={styles.guestCard}>
      <Text style={styles.guestTitle}>Votre Espace Personnel</Text>
      <Text style={styles.guestSubtitle}>
        Connectez-vous pour suivre vos commandes, gérer vos favoris et participer à nos jeux exclusifs.
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => navigation.navigate('SignUp')}>
          <Text style={[styles.btnText, styles.btnTextPrimary]}>Créer un compte</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => Alert.alert('Connexion', 'Écran de connexion à créer.')}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const LoggedInView = () => (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.initials}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email || user?.phoneNumber}</Text>
        </View>
      </View>
      {/* AJOUT: Section des badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes Badges de Supporter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeContainer}>
          {mockParticipatedContests.map(contest => (
            <View key={contest.contestId} style={styles.badge}>
              <MaterialCommunityIcons name={contest.badgeIcon} size={32} color="#f59e0b" />
              <Text style={styles.badgeText} numberOfLines={2}>
                {contest.contestName}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compte</Text>
        </View>

        {user ? <LoggedInView /> : <GuestView />}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <ProfileListItem
            icon="notifications-outline"
            label="Notifications"
            isSwitch
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <ProfileListItem
            icon="information-circle-outline"
            label="À propos de nous"
            onPress={() => navigation.navigate('Store')}
          />
          <ProfileListItem
            icon="help-circle-outline"
            label="Aide & FAQ"
            onPress={() => Alert.alert('Aide', "Écran d'aide à créer.")}
          />
        </View>

        {user?.isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <ProfileListItem
              icon="trophy-outline"
              label="Gérer les gagnants"
              onPress={() => navigation.navigate('AdminWinners')}
            />
          </View>
        )}

        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  guestCard: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#f2f3f5',
    borderRadius: 16,
    alignItems: 'center',
  },
  guestTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  guestSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  buttonContainer: { width: '100%', gap: 12, marginTop: 20 },
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnPrimary: { backgroundColor: '#111' },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  btnTextPrimary: { color: '#fff' },
  btnSecondary: { backgroundColor: '#e5e7eb' },
  btnTextSecondary: { color: '#111' },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  profileEmail: { fontSize: 14, color: '#888', marginTop: 2 },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 12,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  badgeText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#713f12',
    fontWeight: '600',
    marginTop: 6,
  },
  logoutButton: {
    marginTop: 32,
    marginBottom: 24,
    marginHorizontal: 16,
    backgroundColor: '#fce8e6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#d93025',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileScreen;
