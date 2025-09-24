// src/components/VoteConfirmationModal.tsx
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Candidate } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

const VoteConfirmationModal: React.FC<Props> = ({ visible, onClose, candidate }) => {
  if (!candidate) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Je soutiens ${candidate.name} au concours du Journaliste Tech de l'Année ! Faites comme moi ! #ConcoursAfricaphone`,
        // url: 'URL_DE_VOTRE_APP' // Optionnel
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modalView}>
          <Ionicons name="checkmark-circle" size={60} color="#22c55e" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Vote enregistré !</Text>
          <Text style={styles.subtitle}>Merci pour votre soutien à {candidate.name}.</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Partager mon vote</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Fermer</Text>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default VoteConfirmationModal;
