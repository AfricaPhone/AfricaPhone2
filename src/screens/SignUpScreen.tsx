// src/screens/SignUpScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { signInWithPhoneNumber as firebaseSignInWithPhoneNumber } from '@react-native-firebase/auth';


const SignUpScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State for user details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // State for phone authentication flow
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signInWithPhoneNumber = async () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    
    // IMPORTANT: Use international format, e.g., +229XXXXXXXX for Benin
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de téléphone au format international (ex: +22912345678).');
        return;
    }

    setIsSubmitting(true);
    try {
      const confirmation = await firebaseSignInWithPhoneNumber(auth, phoneNumber);
      setConfirm(confirmation);
      Alert.alert('Code envoyé', `Un code de vérification a été envoyé au ${phoneNumber}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le code. Vérifiez le numéro de téléphone et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmCode = async () => {
    if (!confirm || !code) return;
    setIsSubmitting(true);
    try {
      const userCredential = await confirm.confirm(code);
      const user = userCredential?.user;

      if (user) {
        // Create user document in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: user.phoneNumber,
          createdAt: serverTimestamp(),
        });
        // The onAuthStateChanged listener in StoreContext will handle the rest.
        // No need to navigate from here.
      } else {
        throw new Error("La création de l'utilisateur a échoué.");
      }
    } catch (error) {
      console.error("Erreur lors de la confirmation du code ou de la création du profil:", error);
      Alert.alert('Erreur', 'Le code est invalide ou une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {!confirm ? (
            <View style={styles.formContainer}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez notre communauté pour une expérience unique.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor="#9ca3af"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                textContentType="givenName"
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
              <TextInput
                style={styles.input}
                placeholder="Numéro de téléphone (ex: +22912345678)"
                placeholderTextColor="#9ca3af"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, isSubmitting && styles.btnDisabled]}
                onPress={signInWithPhoneNumber}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, styles.btnTextPrimary]}>Envoyer le code</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.title}>Vérification</Text>
              <Text style={styles.subtitle}>Entrez le code à 6 chiffres reçu par SMS au {phoneNumber}.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Code à 6 chiffres"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                textContentType="oneTimeCode"
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, isSubmitting && styles.btnDisabled]}
                onPress={confirmCode}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, styles.btnTextPrimary]}>Vérifier et créer le compte</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirm(null)} style={{marginTop: 16}}>
                <Text style={styles.linkText}>Changer de numéro ?</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  btnDisabled: {
    backgroundColor: '#9ca3af',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnTextPrimary: {
    color: '#fff',
  },
  linkText: {
    color: '#111',
    textAlign: 'center',
    fontWeight: '600',
  }
});

export default SignUpScreen;
