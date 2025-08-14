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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, getDoc, updateDoc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/StoreContext';
import { Prediction, Match } from '../types';

const PredictionGameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params as { matchId: string };
  const { user } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  
  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchStarted = useMemo(() => {
    if (!match) return true; // Bloquer par défaut si les données du match ne sont pas encore chargées
    return new Date() > match.startTime.toDate();
  }, [match]);
  
  const matchEnded = useMemo(() => {
      if (!match) return false;
      return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
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
    if (!matchId) return;

    setLoading(true);

    const matchDocRef = doc(db, 'matches', matchId);
    const unsubscribeMatch = onSnapshot(matchDocRef, (matchDoc) => {
      if (matchDoc.exists()) {
        setMatch({ id: matchDoc.id, ...matchDoc.data() } as Match);
      } else {
        console.error("Match non trouvé !");
        setMatch(null);
      }
    }, (error) => {
      console.error("Erreur de lecture du match: ", error);
    });

    const predictionsRef = collection(db, 'predictions');
    const q = query(predictionsRef, where('matchId', '==', matchId));

    const unsubscribePredictions = onSnapshot(q, (querySnapshot) => {
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

    return () => {
      unsubscribeMatch();
      unsubscribePredictions();
    };
  }, [matchId]);

  const handleOpenModal = () => {
    if (!user) {
      navigation.navigate('AuthPrompt');
      return;
    }

    if (currentUserPrediction) {
      setScoreA(String(currentUserPrediction.scoreA));
      setScoreB(String(currentUserPrediction.scoreB));
    } else {
      setScoreA('');
      setScoreB('');
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action.');
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

    setIsSubmitting(true);
    try {
      const newScores = {
        scoreA: parseInt(scoreA, 10),
        scoreB: parseInt(scoreB, 10),
      };

      if (currentUserPrediction?.id) {
        // Mettre à jour la prédiction existante
        const predictionRef = doc(db, 'predictions', currentUserPrediction.id);
        await updateDoc(predictionRef, newScores);
        Alert.alert('Pronostic mis à jour !', 'Votre pronostic a été modifié.');
      } else {
        // Créer une nouvelle prédiction
        const newPrediction: Omit<Prediction, 'id'> = {
          userId: user.id,
          userName: user.name,
          matchId: matchId,
          ...newScores,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'predictions'), newPrediction);
        Alert.alert('Pronostic validé !', 'Votre pronostic a été enregistré. Bonne chance !');
      }
      setModalVisible(false);
    } catch (error) {
      console.error("Erreur d'enregistrement du pronostic: ", error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderResultCard = () => {
    if (!matchEnded || !currentUserPrediction) return null;

    if (currentUserPrediction.isWinner) {
      return (
        <View style={[styles.resultCard, styles.winnerCard]}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle}>Score Exact !</Text>
            <Text style={styles.resultSubtitle}>Bravo, vous êtes éligible pour l'étape suivante !</Text>
          </View>
        </View>
      );
    }

    return (
        <View style={[styles.resultCard, styles.loserCard]}>
          <Ionicons name="sad-outline" size={24} color="#4b5563" />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle}>Dommage, ce n'est pas le bon score.</Text>
            <Text style={styles.resultSubtitle}>
              Votre pronostic : {currentUserPrediction.scoreA} - {currentUserPrediction.scoreB}
            </Text>
          </View>
        </View>
    );
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
        <TouchableOpacity style={styles.submitButton} onPress={handleOpenModal}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Modifier mon pronostic</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.submitButton} onPress={handleOpenModal}>
        <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
        <Text style={styles.submitButtonText}>Placer mon pronostic</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Jeu Pronostique</Text>
            <View style={{ width: 40 }} />
          </View>
          <ActivityIndicator style={{ flex: 1 }} size="large" color="#FF7A00" />
      </SafeAreaView>
    )
  }

  if (!match) {
    return (
       <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Erreur</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Match non trouvé</Text>
            <Text style={styles.emptySubText}>Ce match n'existe pas ou a été supprimé.</Text>
          </View>
      </SafeAreaView>
    )
  }

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
            <Text style={styles.competitionText}>{match.competition}</Text>
          </View>
          <Text style={styles.dateText}>{`${match.startTime.toDate().toLocaleDateString('fr-FR')} - ${match.startTime.toDate().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`}</Text>
          <View style={styles.matchContainer}>
            <View style={styles.teamContainer}>
              <View style={styles.flagContainer}>
                <Image source={{ uri: 'https://flagcdn.com/w320/sn.png' }} style={styles.flag} />
              </View>
              <Text style={styles.teamName}>{match.teamA}</Text>
            </View>
            {matchEnded ? (
              <Text style={styles.finalScoreText}>{`${match.finalScoreA} - ${match.finalScoreB}`}</Text>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
            <View style={styles.teamContainer}>
              <View style={styles.flagContainer}>
                <Image source={{ uri: 'https://flagcdn.com/w320/ci.png' }} style={styles.flag} />
              </View>
              <Text style={styles.teamName}>{match.teamB}</Text>
            </View>
          </View>
        </View>
        
        {renderResultCard()}

        {currentUserPrediction && !matchEnded && (
            <View style={styles.votedCard}>
                <Text style={styles.votedTitle}>Votre pronostic actuel</Text>
                <Text style={styles.votedScore}>{`${currentUserPrediction.scoreA} - ${currentUserPrediction.scoreB}`}</Text>
            </View>
        )}

        {renderActionButton()}

        <View style={styles.card}>
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>Tendances des pronostics</Text>
            <View style={styles.participantsChip}>
              <Ionicons name="people" size={14} color="#1d4ed8" />
              <Text style={styles.participantsText}>{predictions.length} participants</Text>
            </View>
          </View>
          {communityTrends.length > 0 ? (
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
            <Text style={styles.modalTitle}>{currentUserPrediction ? 'Modifier' : 'Votre'} Pronostic</Text>
            <Text style={styles.modalSubtitle}>{match.teamA} vs {match.teamB}</Text>
            
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
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>{currentUserPrediction ? 'Valider la modification' : 'Valider le pronostic'}</Text>}
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
  backButton: { padding: 8, marginLeft: -8 },
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

  // Result Cards
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  winnerCard: {
    backgroundColor: '#fefce8',
    borderColor: '#facc15',
    borderWidth: 1,
  },
  loserCard: {
      backgroundColor: '#f3f4f6',
      borderColor: '#e5e7eb',
      borderWidth: 1,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
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
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default PredictionGameScreen;