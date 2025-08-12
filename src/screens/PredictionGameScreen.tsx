// src/screens/PredictionGameScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, getDoc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/StoreContext';
import { Prediction, Match } from '../types';

const MATCH_ID = 'CAN2025-FINALE'; // ID unique pour ce match

const PredictionGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  
  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchStarted = useMemo(() => {
    if (!match) return true; // Block by default
    return new Date() > match.startTime.toDate();
  }, [match]);

  const currentUserPrediction = useMemo(() => 
    predictions.find(p => p.userId === user?.id),
    [predictions, user]
  );

  const communityTrends = useMemo(() => {
    if (predictions.length === 0) return [];
    const scoreCounts: { [key: string]: number } = {};
    predictions.forEach(p => {
      const key = `${p.scoreA}-${p.scoreB}`;
      scoreCounts[key] = (scoreCounts[key] || 0) + 1;
    });

    return Object.entries(scoreCounts)
      .map(([score, count]) => ({
        score,
        count,
        percentage: Math.round((count / predictions.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [predictions]);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const matchDocRef = doc(db, 'matches', MATCH_ID);
        const matchDoc = await getDoc(matchDocRef);
        if (matchDoc.exists()) {
          setMatch({ id: matchDoc.id, ...matchDoc.data() } as Match);
        } else {
          console.error("Match non trouvé !");
        }
      } catch (error) {
        console.error("Erreur de lecture du match: ", error);
      }
    };

    fetchMatchData();

    const predictionsRef = collection(db, 'predictions');
    const q = query(predictionsRef, where('matchId', '==', MATCH_ID));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const preds: Prediction[] = [];
      querySnapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        preds.push({ id: doc.id, ...doc.data() } as Prediction);
      });
      setPredictions(preds);
      setLoading(false);
    }, (error) => {
      console.error("Erreur de lecture des pronostics: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour placer un pronostic.', [
        { text: 'OK', onPress: () => navigation.navigate('Profile' as never) }
      ]);
      return;
    }
    if (matchStarted) {
      Alert.alert('Trop tard !', 'Les pronostics pour ce match sont terminés.');
      return;
    }
    if (!scoreA.trim() || !scoreB.trim()) {
      Alert.alert('Score incomplet', 'Veuillez entrer un score pour les deux équipes.');
      return;
    }
    if (currentUserPrediction) {
      Alert.alert('Déjà voté', 'Vous avez déjà placé un pronostic pour ce match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPrediction: Omit<Prediction, 'id'> = {
        userId: user.id,
        userName: user.name,
        matchId: MATCH_ID,
        scoreA: parseInt(scoreA, 10),
        scoreB: parseInt(scoreB, 10),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'predictions'), newPrediction);
      setModalVisible(false);
      Alert.alert('Pronostic validé !', 'Votre pronostic a été enregistré. Bonne chance !');
    } catch (error) {
      console.error("Erreur d'enregistrement du pronostic: ", error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionButton = () => {
    if (matchStarted) {
      return (
        <View style={[styles.submitButton, styles.buttonDisabled]}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Pronostics terminés</Text>
        </View>
      );
    }
    if (currentUserPrediction) {
      return (
        <View style={styles.votedCard}>
          <Text style={styles.votedTitle}>Votre pronostic</Text>
          <Text style={styles.votedScore}>{`${currentUserPrediction.scoreA} - ${currentUserPrediction.scoreB}`}</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity style={styles.submitButton} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
        <Text style={styles.submitButtonText}>Placer mon pronostic</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jeu Pronostique</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color="#FF7A00" />
            <Text style={styles.competitionText}>{match?.competition || '...'}</Text>
          </View>
          <Text style={styles.dateText}>{match ? `${match.startTime.toDate().toLocaleDateString('fr-FR')} - ${match.startTime.toDate().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}` : '...'}</Text>
          <View style={styles.matchContainer}>
            <View style={styles.teamContainer}>
              <View style={styles.flagContainer}>
                <Image source={{ uri: 'https://flagcdn.com/w320/sn.png' }} style={styles.flag} />
              </View>
              <Text style={styles.teamName}>{match?.teamA || '...'}</Text>
            </View>
            {typeof match?.finalScoreA === 'number' && typeof match?.finalScoreB === 'number' ? (
              <Text style={styles.finalScoreText}>{`${match.finalScoreA} - ${match.finalScoreB}`}</Text>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
            <View style={styles.teamContainer}>
              <View style={styles.flagContainer}>
                <Image source={{ uri: 'https://flagcdn.com/w320/ci.png' }} style={styles.flag} />
              </View>
              <Text style={styles.teamName}>{match?.teamB || '...'}</Text>
            </View>
          </View>
        </View>

        {renderActionButton()}

        <View style={styles.card}>
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>Tendances des pronostics</Text>
            <View style={styles.participantsChip}>
              <Ionicons name="people" size={14} color="#1d4ed8" />
              <Text style={styles.participantsText}>{predictions.length} participants</Text>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color="#FF7A00" />
          ) : communityTrends.length > 0 ? (
            communityTrends.map((pred, index) => (
              <View key={index} style={styles.predictionRow}>
                <Text style={styles.predictionScore}>{pred.score}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${pred.percentage}%` }]} />
                </View>
                <Text style={styles.predictionPercentage}>{`${pred.percentage}%`}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noPredictionsText}>Soyez le premier à faire un pronostic !</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Votre Pronostic</Text>
            <Text style={styles.modalSubtitle}>{match?.teamA} vs {match?.teamB}</Text>
            
            <View style={styles.modalScoreContainer}>
              <TextInput
                  style={styles.scoreInputModal}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={scoreA}
                  onChangeText={setScoreA}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  autoFocus={true}
              />
              <Text style={styles.modalSeparator}>-</Text>
              <TextInput
                  style={styles.scoreInputModal}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={scoreB}
                  onChangeText={setScoreB}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity style={[styles.modalSubmitButton, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Valider le pronostic</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  backButton: { padding: 8 },
  headerTitle: { color: '#111', fontSize: 20, fontWeight: 'bold' },
  scrollContent: {
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    alignSelf: 'center',
  },
  competitionText: { color: '#FF7A00', fontSize: 16, fontWeight: '700' },
  dateText: { color: '#6b7280', fontSize: 12, marginTop: 4, marginBottom: 20, textAlign: 'center' },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '100%',
  },
  teamContainer: { alignItems: 'center', width: 100 },
  flagContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f2f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  flag: { width: 70, height: 70, borderRadius: 35 },
  teamName: { color: '#111', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  vsText: { color: '#9ca3af', fontSize: 14, fontWeight: '900', marginTop: 30 },
  finalScoreText: { color: '#111', fontSize: 36, fontWeight: 'bold', marginTop: 20},
  
  communityHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  communityTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  participantsText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionScore: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 15,
    width: 60,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f2f3f5',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#FF7A00',
    borderRadius: 4,
  },
  predictionPercentage: {
    color: '#6b7280',
    fontSize: 14,
    width: 40,
    textAlign: 'right',
  },
  noPredictionsText: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
  },

  submitButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  votedCard: {
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  votedTitle: {
    color: '#0c4a6e',
    fontSize: 14,
    fontWeight: '600',
  },
  votedScore: {
    color: '#0369a1',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  modalTitle: {
    color: '#111',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  modalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalSeparator: {
    color: '#9ca3af',
    fontSize: 36,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  scoreInputModal: {
    width: 80,
    height: 90,
    backgroundColor: '#f2f3f5',
    borderRadius: 16,
    color: '#111',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  modalSubmitButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  }
});

export default PredictionGameScreen;
