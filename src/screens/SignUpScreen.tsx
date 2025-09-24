import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store/StoreContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type SignUpScreenProps = StackNavigationProp<RootStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenProps>();
  const { signInWithGoogle } = useStore();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '5752767997971470489-e8802952kpah6cl2q511f4f6pft2rk3i.apps.googleusercontent.com',
    });
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion.');
      setError(null);
    }
  }, [error]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err as Error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rejoignez-nous</Text>
        <Text style={styles.subtitle}>Connectez-vous pour commencer votre shopping.</Text>

        <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleSignIn}>
          <FontAwesome name="google" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Continuer avec Google</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.laterButton} onPress={() => navigation.goBack()}>
        <Text style={styles.laterButtonText}>Plus tard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    width: '100%',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  icon: {
    marginRight: 10,
  },
  laterButton: {
    alignSelf: 'center',
    marginBottom: 40,
  },
  laterButtonText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
});

export default SignUpScreen;
