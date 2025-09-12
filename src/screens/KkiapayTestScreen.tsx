// src/screens/KkiapayTestScreen.tsx
import React, { useEffect, useState } from 'react';
// Importé depuis la bonne bibliothèque pour que la prop 'edges' fonctionne
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useKkiapay } from '@kkiapay-org/react-native-sdk';
import { useStore } from '../store/StoreContext';

const KkiapayTestScreen = () => {
  const navigation = useNavigation();
  const { user } = useStore();
  const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKkiapay();
  const [paymentStatus, setPaymentStatus] = useState<string>('En attente de paiement...');

  useEffect(() => {
    // Ajout des écouteurs pour les événements de succès et d'échec
    addSuccessListener(data => {
      console.log('Paiement réussi:', data);
      setPaymentStatus(`Paiement Réussi ! Transaction ID: ${data.transactionId}`);
      Alert.alert('Paiement Réussi !', `Transaction ID: ${data.transactionId}`);
    });

    addFailedListener(error => {
      console.log('Échec du paiement:', error);
      setPaymentStatus(`Paiement Échoué: ${error.message}`);
      Alert.alert('Paiement Échoué', `Raison: ${error.message}`);
    });

    // La logique de nettoyage est retirée car non supportée par cette version de la bibliothèque
    return () => {};
  }, [addSuccessListener, addFailedListener]);

  const handlePayment = () => {
    if (!user) {
      Alert.alert('Non connecté', 'Veuillez vous connecter pour effectuer un test de paiement.');
      return;
    }

    setPaymentStatus('Ouverture du widget de paiement...');
    openKkiapayWidget({
      amount: 100,
      // VOTRE CLÉ PUBLIQUE EST INTÉGRÉE ICI
      api_key: '1fa093a08efe11f0b1188b81656cf9d1',
      sandbox: true,
      phone: user.phoneNumber || '97000000',
      email: user.email || 'test@example.com',
      name: user.name || 'Test User',
      reason: 'Test de paiement depuis Africaphone',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test de Paiement Kkiapay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>Cette page permet de simuler un paiement en mode Sandbox.</Text>

        <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
          <Text style={styles.payButtonText}>Payer 100 FCFA (Test)</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Statut de la transaction :</Text>
          <Text style={styles.statusText}>{paymentStatus}</Text>
        </View>
      </View>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#111',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 32,
  },
  payButton: {
    backgroundColor: '#111',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default KkiapayTestScreen;
