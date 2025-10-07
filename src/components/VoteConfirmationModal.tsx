import React, { useMemo } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Candidate } from '../types';

type VoteStatus = 'success' | 'failed';

interface Props {
  visible: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  transactionId?: string | null;
  status?: VoteStatus;
  message?: string | null;
}

const VoteConfirmationModal: React.FC<Props> = ({
  visible,
  onClose,
  candidate,
  transactionId,
  status = 'success',
  message,
}) => {
  const isSuccess = status === 'success';
  const iconName = isSuccess ? 'checkmark-circle' : 'close-circle';
  const iconColor = isSuccess ? '#22c55e' : '#ef4444';

  const effectiveMessage = useMemo(() => {
    if (message && message.trim().length > 0) {
      return message;
    }
    if (isSuccess && candidate) {
      return 'Merci pour votre soutien a ' + candidate.name + '.';
    }
    if (isSuccess) {
      return 'Merci pour votre vote !';
    }
    return "Votre paiement n'a pas abouti. Veuillez reessayer.";
  }, [candidate, isSuccess, message]);

  const handleShare = async () => {
    if (!candidate) {
      return;
    }
    try {
      await Share.share({
        message:
          'Je soutiens ' +
          candidate.name +
          " au concours du Journaliste Tech de l'annee ! Faites comme moi ! #ConcoursAfricaphone",
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modalView}>
          <Ionicons name={iconName} size={60} color={iconColor} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>{isSuccess ? 'Vote enregistre !' : 'Paiement interrompu'}</Text>
          <Text style={styles.subtitle}>{effectiveMessage}</Text>

          {transactionId ? (
            <View style={styles.transactionBox}>
              <Text style={styles.transactionLabel}>Identifiant de transaction</Text>
              <Text style={styles.transactionValue}>{transactionId}</Text>
            </View>
          ) : null}

          {isSuccess && candidate ? (
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Partager mon vote</Text>
            </TouchableOpacity>
          ) : null}

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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  transactionBox: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  transactionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
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
    marginBottom: 12,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeText: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default VoteConfirmationModal;
