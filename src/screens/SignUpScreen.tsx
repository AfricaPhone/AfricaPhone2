// src/screens/SignUpScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import LoadingModal from '../components/LoadingModal';

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '203471818329-mgplh0srpmm9cilo493js0qam6lbbvbd.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const signInResponse = await GoogleSignin.signIn();

      // If sign-in didn't succeed (e.g., user cancelled), just exit
      if (!isSuccessResponse(signInResponse)) {
        setIsSubmitting(false);
        return;
      }

      const idToken = signInResponse.data?.idToken;
      if (!idToken) {
        throw new Error('ID token manquant dans la réponse Google.');
      }

      // RN Firebase: build credential and sign in
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;

      if (user) {
        // Check if user exists in Firestore
        const userDocRef = firestore().collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists()) {
          Alert.alert('Bienvenue à nouveau !', 'Heureux de vous revoir.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          const displayName = user.displayName ?? '';
          const [firstName, ...rest] = displayName.split(' ').filter(Boolean);
          const lastName = rest.join(' ');

          navigation.replace('CreateProfile', {
            userId: user.uid,
            firstName: firstName || '',
            lastName: lastName || '',
            email: user.email,
          });
        }
      }
    } catch (error: unknown) {
      // ✅ Call the predicate instead of checking the function object
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled: no alert necessary
        } else if (error.code === statusCodes.IN_PROGRESS) {
          Alert.alert('Connexion en cours', 'Une opération de connexion est déjà en cours.');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(
            'Erreur',
            'Les services Google Play ne sont pas disponibles ou sont obsolètes sur cet appareil.'
          );
        } else {
          console.error('Erreur Google Sign-In: ', error);
          Alert.alert(
            'Erreur',
            "Une erreur inattendue est survenue lors de la connexion avec Google."
          );
        }
      } else {
        console.error('Erreur de connexion Google: ', error);
        Alert.alert(
          'Erreur',
          "Une erreur inattendue est survenue lors de la connexion avec Google."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LoadingModal isVisible={isSubmitting} message={'Connexion en cours...'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Ionicons
            name="key-outline"
            size={60}
            color="#111"
            style={{ alignSelf: 'center', marginBottom: 20 }}
          />
          <Text style={styles.title}>Connectez-vous</Text>
          <Text style={styles.subtitle}>
            Utilisez votre compte Google pour accéder à toutes les fonctionnalités de
            l'application.
          </Text>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <Ionicons name="logo-google" size={22} color="#fff" />
            <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  header: {
    position: 'absolute',
    top: 10,
    left: 16,
  },
  backButton: {
    padding: 8,
  },
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    width: '100%',
    marginTop: 8,
  },
  googleButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
});

export default SignUpScreen;
