// src/components/UpdateModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, AppState } from 'react-native';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';

const UpdateModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');

  const checkForUpdate = async () => {
    try {
      // 1. Récupérer les informations depuis Firestore
      const updateDocRef = doc(db, 'config', 'appUpdate');
      const docSnap = await getDoc(updateDocRef);

      // CORRECTION: On récupère les données d'abord, PUIS on les vérifie.
      if (docSnap.exists()) {
        const config = docSnap.data();

        // Cette vérification garantit à TypeScript que 'config' n'est pas undefined.
        if (config) {
          const latestVersionCode = config.latest_version_code;
          const url = config.update_url;

          // 2. Version de l'application "hardcodée"
          const currentVersionCode = 4;

          console.log(`Version Firestore: ${latestVersionCode}, Version App (Hardcodée): ${currentVersionCode}`);

          // 3. Comparer les versions
          if (latestVersionCode > currentVersionCode) {
            setUpdateUrl(url);
            setIsVisible(true);
          }
        } else {
          console.log('Le document de configuration de mise à jour est vide.');
        }
      } else {
        console.log("Le document de configuration de mise à jour n'existe pas.");
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la mise à jour :', error);
    }
  };

  useEffect(() => {
    // Vérifier au démarrage
    checkForUpdate();

    // Ajouter un écouteur pour vérifier à nouveau lorsque l'application revient au premier plan
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkForUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUpdatePress = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Empêche de fermer la modale avec le bouton retour
    >
      <View style={styles.container}>
        <View style={styles.modalView}>
          <Ionicons name="cloud-download-outline" size={60} color="#111" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Mise à jour disponible</Text>
          <Text style={styles.subtitle}>
            Une nouvelle version de l&apos;application est disponible. Veuillez mettre à jour pour continuer à profiter
            de toutes les fonctionnalités.
          </Text>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePress}>
            <Text style={styles.updateButtonText}>Mettre à jour maintenant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 24,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UpdateModal;
