// src/screens/CreateProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import LoadingModal from '../components/LoadingModal';
import { RootStackParamList } from '../types';

// Définition des paramètres de la route attendus
type CreateProfileScreenRouteProp = RouteProp<RootStackParamList, 'CreateProfile'>;

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<CreateProfileScreenRouteProp>();
  // Récupération des paramètres, y compris les infos de Google
  const { userId, firstName: googleFirstName, lastName: googleLastName, email } = route.params;

  // Pré-remplissage des champs avec les données de Google
  const [firstName, setFirstName] = useState(googleFirstName || '');
  const [lastName, setLastName] = useState(googleLastName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir votre prénom et votre nom.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      // Sauvegarde du profil avec l'email et sans numéro de téléphone
      await setDoc(userDocRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email,
        phoneNumber: null, // Le numéro de téléphone n'est plus utilisé
        createdAt: serverTimestamp(),
      });

      // Ferme la pile de modales d'authentification pour revenir à l'écran principal
      navigation.getParent()?.goBack();
    } catch (error) {
      console.error('Error creating profile: ', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création de votre profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LoadingModal isVisible={isSubmitting} message={'Création du profil...'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <Text style={styles.title}>Finalisez votre profil</Text>
            <Text style={styles.subtitle}>Vérifiez votre nom et prénom, puis terminez votre inscription.</Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              textContentType="givenName"
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleCreateProfile}
              disabled={isSubmitting}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Terminer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  formContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f2f3f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
  },
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: '#111',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnTextPrimary: {
    color: '#fff',
  },
});

export default CreateProfileScreen;
