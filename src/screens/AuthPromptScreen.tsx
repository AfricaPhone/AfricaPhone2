// src/screens/AuthPromptScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';

const AuthPromptScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Ionicons name="close" size={28} color="#111" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1593697821252-8c710070397a?q=80&w=1887' }}
          style={styles.backgroundImage}
        />
        <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,1)']} style={styles.gradient} />
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#111" />
        </View>
        <Text style={styles.title}>Accès Membre Requis</Text>
        <Text style={styles.subtitle}>
          Pour placer un pronostic, vous devez être connecté. Créez un compte ou connectez-vous pour rejoindre le jeu !
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => {
            navigation.goBack(); // Ferme cette modale d'abord
            navigation.navigate('SignUp'); // Ouvre ensuite la modale d'inscription
          }}
        >
          <Text style={[styles.btnText, styles.btnTextPrimary]}>Créer un compte</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => Alert.alert('Connexion', 'Écran de connexion à créer.')}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>J&apos;ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 99,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
  btnSecondary: {
    backgroundColor: '#e5e7eb',
  },
  btnTextSecondary: {
    color: '#111',
  },
});

export default AuthPromptScreen;
