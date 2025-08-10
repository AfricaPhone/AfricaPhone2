import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/StoreContext';
import ProfileListItem from '../components/ProfileListItem';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen: React.FC = () => {
  const { user, login, logout } = useStore();
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [notifications, setNotifications] = useState(true);

  const handleAction = (action: string) => {
    Alert.alert('Action', `Navigation vers ${action}`);
  };

  const GuestView = () => (
    <>
      <View style={styles.guestCard}>
        <Text style={styles.guestTitle}>Votre Espace Personnel</Text>
        <Text style={styles.guestSubtitle}>Connectez-vous pour suivre vos commandes, sauvegarder vos adresses et profiter d'offres exclusives.</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={login}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]}>
            <Text style={[styles.btnText, styles.btnTextSecondary]}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const LoggedInView = () => (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.initials}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes Commandes</Text>
        <ProfileListItem icon="cube-outline" label="Toutes les commandes" onPress={() => handleAction('Commandes')} />
        <ProfileListItem icon="heart-outline" label="Articles consultés" onPress={() => handleAction('Articles consultés')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon Compte</Text>
        <ProfileListItem icon="person-outline" label="Informations personnelles" onPress={() => handleAction('Informations')} />
        <ProfileListItem icon="location-outline" label="Adresses de livraison" onPress={() => handleAction('Adresses')} />
        <ProfileListItem icon="card-outline" label="Moyens de paiement" onPress={() => handleAction('Paiement')} />
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
            icon="color-palette-outline"
            label="Apparence"
            detail={theme.charAt(0).toUpperCase() + theme.slice(1)}
            onPress={() => handleAction('Apparence')}
          />
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
          <ProfileListItem icon="help-circle-outline" label="Aide & FAQ" onPress={() => handleAction('Aide')} />
          <ProfileListItem icon="chatbubble-ellipses-outline" label="Nous contacter" onPress={() => handleAction('Contact')} />
        </View>

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
  
  // Guest View
  guestCard: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#f2f3f5',
    borderRadius: 16,
    alignItems: 'center',
  },
  guestTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  guestSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#111' },
  btnText: { fontWeight: 'bold' },
  btnTextPrimary: { color: '#fff' },
  btnSecondary: { backgroundColor: '#e5e7eb' },
  btnTextSecondary: { color: '#111' },

  // Logged-in View
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
  
  // Common sections
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
  logoutButton: {
    marginTop: 32,
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
