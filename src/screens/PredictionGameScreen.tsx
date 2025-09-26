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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// MODIFICATION: Importez les dépendances pour les fonctions Firebase
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { collection, onSnapshot, query, where, doc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/StoreContext';
import { Prediction, Match } from '../types';

// MODIFICATION: Initialisez l'instance des Fonctions
const functions = getFunctions();

const APP_SHARE_URL = 'https://africaphone.app';
const WHATSAPP_SHARE_MESSAGE = `Rejoins-moi sur AfricaPhone pour pronostiquer et tenter ta chance ! Telecharge l'application ici : ${APP_SHARE_URL}`;
const REQUIRED_APP_SHARES = 2;
const LOCAL_SHARE_COUNT_KEY = 'local_app_share_count_v1';

const PredictionGameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params as { matchId: string };
  const { user, updateUserProfile } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePromptVisible, setSharePromptVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localShareCount, setLocalShareCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCAL_SHARE_COUNT_KEY);
        const parsed = raw ? parseInt(raw, 10) : 0;
        setLocalShareCount(Number.isFinite(parsed) ? parsed : 0);
      } catch (e) {
        setLocalShareCount(0);
      }
    })();
  }, []);

  const userShareCount = user?.appShareCount ?? (user?.hasSharedApp ? REQUIRED_APP_SHARES : 0);
  const effectiveShareCount = Math.max(userShareCount || 0, localShareCount || 0);
  const shareProgressRatio = Math.min(effectiveShareCount / REQUIRED_APP_SHARES, 1);
  const shareProgressPercent = Math.round(shareProgressRatio * 100);
  const remainingShares = Math.max(REQUIRED_APP_SHARES - effectiveShareCount, 0);
  const hasCompletedShareRequirement = shareProgressRatio >= 1;

  const ensureUserHasShared = () => {
    if (!hasCompletedShareRequirement) {
      setSharePromptVisible(true);
      return false;
    }
    return true;
  };

  const openSharePromptAndIncrement = async () => {
    if (!user) {
      const newLocal = Math.min((localShareCount ?? 0) + 1, REQUIRED_APP_SHARES);
      try {
        await AsyncStorage.setItem(LOCAL_SHARE_COUNT_KEY, String(newLocal));
        setLocalShareCount(newLocal);
      } catch (_) {
        setLocalShareCount(newLocal);
      } finally {
        setSharePromptVisible(true);
      }
      navigation.navigate('AuthPrompt');
      return;
    }
    // Incrément optimiste dès le clic sur "Partager" (50% si 2 partages requis)
    const updatedShareCount = Math.min((userShareCount ?? 0) + 1, REQUIRED_APP_SHARES);
    try {
      await updateUserProfile({
        appShareCount: updatedShareCount,
        hasSharedApp: updatedShareCount >= REQUIRED_APP_SHARES,
        lastAppShareAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erreur lors de l'incrément du partage:", error);
    } finally {
      setSharePromptVisible(true);
    }
  };

  const handleShareToWhatsApp = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_SHARE_MESSAGE)}`;
    setIsSharing(true);
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      }

      setSharePromptVisible(false);
      const remainingAfterShare = Math.max(REQUIRED_APP_SHARES - (userShareCount ?? 0), 0);
      const successMessage =
        remainingAfterShare > 0
          ? `Merci d'avoir partage l'application. Encore ${remainingAfterShare} partage${remainingAfterShare > 1 ? 's' : ''} pour debloquer les pronostics.`
          : `Merci d'avoir partage l'application. Vous pouvez maintenant pronostiquer.`;
      Alert.alert('Merci !', successMessage);
    } catch (error) {
      console.error('Erreur de partage WhatsApp: ', error);
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. Reessayez.");
    } finally {
      setIsSharing(false);
    }
  };

  const matchStarted = useMemo(() => {
    if (!match) return true;
    const GRACE_PERIOD_MS = 60 * 1000;
    const cutOffTime = match.startTime.toDate().getTime() - GRACE_PERIOD_MS;
    return new Date().getTime() > cutOffTime;
  }, [match]);

  const matchEnded = useMemo(() => {
    if (!match) return false;
    return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  }, [match]);

  const currentUserPrediction = useMemo(() => predictions.find(p => p.userId === user?.id), [predictions, user]);

  const communityTrends = useMemo(() => {
    if (!match || !match.trends || !match.predictionCount) return [];

    const totalPredictions = match.predictionCount;
    if (totalPredictions === 0) return [];

    return Object.entries(match.trends)
      .map(([score, count]) => ({
        score,
        count,
        percentage: Math.round((count / totalPredictions) * 100),
      }))
      .sort((a, b) => b.count - a.count); // Suppression du .slice(0, 5)
  }, [match]);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);

    const matchDocRef = doc(db, 'matches', matchId);
    const unsubscribeMatch = onSnapshot(
      matchDocRef,
      matchDoc => {
        if (matchDoc.exists()) {
          setMatch({ id: matchDoc.id, ...matchDoc.data() } as Match);
        } else {
          console.error('Match non trouvé !');
          setMatch(null);
        }
        if (loading) setLoading(false);
      },
      error => {
        console.error('Erreur de lecture du match: ', error);
        if (loading) setLoading(false);
      }
    );

    let unsubscribePredictions = () => {};
    if (user) {
      const predictionsRef = collection(db, 'predictions');
      const q = query(predictionsRef, where('matchId', '==', matchId), where('userId', '==', user.id));

      unsubscribePredictions = onSnapshot(
        q,
        querySnapshot => {
          const preds: Prediction[] = [];
          querySnapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            preds.push({ id: doc.id, ...doc.data() } as Prediction);
          });
          setPredictions(preds);
        },
        error => {
          console.error('Erreur de lecture du pronostic utilisateur: ', error);
        }
      );
    } else {
      setPredictions([]);
    }

    return () => {
      unsubscribeMatch();
      unsubscribePredictions();
    };
  }, [matchId, user]);

  const handleOpenModal = () => {
    if (!user) {
      navigation.navigate('AuthPrompt');
      return;
    }
    if (!ensureUserHasShared()) {
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
    if (!hasCompletedShareRequirement) {
      Alert.alert('Partage requis', "Partagez d'abord l'application sur WhatsApp pour pronostiquer.");
      return;
    }

    setIsSubmitting(true);
    try {
      // MODIFICATION: Appeler la fonction Cloud au lieu d'écrire directement
      const submitPredictionFn = httpsCallable(functions, 'submitPrediction');

      const payload = {
        matchId: matchId,
        scoreA: parseInt(scoreA, 10),
        scoreB: parseInt(scoreB, 10),
        predictionId: currentUserPrediction?.id, // Envoyer l'ID pour les mises à jour
      };

      const result = await submitPredictionFn(payload);
      const data = result.data as { success: boolean; message: string };

      Alert.alert(data.success ? 'Succès' : 'Erreur', data.message);

      if (data.success) {
        setModalVisible(false);
      }
    } catch (error: any) {
      console.error("Erreur d'enregistrement du pronostic: ", error);
      // Les erreurs HttpsError ont un message lisible par l'utilisateur
      Alert.alert('Erreur', error.message || 'Une erreur est survenue. Veuillez réessayer.');
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
    if (!hasCompletedShareRequirement) {
      return (
        <TouchableOpacity style={[styles.submitButton, styles.shareButton]} onPress={openSharePromptAndIncrement}>
          <MaterialCommunityIcons name="share-outline" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Partager sur WhatsApp</Text>
        </TouchableOpacity>
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
    );
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
    );
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
          <Text
            style={styles.dateText}
          >{`${match.startTime.toDate().toLocaleDateString('fr-FR')} - ${match.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</Text>
          <View style={styles.matchContainer}>
            <View style={styles.teamContainer}>
              <View style={styles.flagContainer}>
                {/* MODIFICATION: Utilisation du logo de l'équipe A depuis Firebase */}
                <Image
                  source={{ uri: match.teamALogo || 'https://placehold.co/100x100/EFEFEF/333333?text=?' }}
                  style={styles.flag}
                />
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
                {/* MODIFICATION: Utilisation du logo de l'équipe B depuis Firebase */}
                <Image
                  source={{ uri: match.teamBLogo || 'https://placehold.co/100x100/EFEFEF/333333?text=?' }}
                  style={styles.flag}
                />
              </View>
              <Text style={styles.teamName}>{match.teamB}</Text>
            </View>
          </View>
        </View>

        {renderResultCard()}

        {!hasCompletedShareRequirement && (
          <View style={styles.shareRequirementCard}>
            <View style={styles.shareRequirementTextContainer}>
              <Text style={styles.shareRequirementTitle}>Partage requis</Text>
              <Text style={styles.shareRequirementSubtitle}>
                Partagez l'application via WhatsApp (2 partages necessaires) pour debloquer les pronostics.
              </Text>
              <View style={styles.shareProgressWrapper}>
                <View style={styles.shareProgressTrack}>
                  <View style={[styles.shareProgressFill, { width: `${shareProgressPercent}%` }]} />
                </View>
                <View style={styles.shareProgressMeta}>
                  <Text style={styles.shareProgressLabel}>{shareProgressPercent}% complet</Text>
                  <Text style={styles.shareProgressRemaining}>
                    {remainingShares > 0
                      ? `Encore ${remainingShares} partage${remainingShares > 1 ? 's' : ''}`
                      : 'Objectif atteint !'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.shareRequirementCta} onPress={openSharePromptAndIncrement}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.shareRequirementCtaText}>Partager</Text>
            </TouchableOpacity>
          </View>
        )}

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
              <Text style={styles.participantsText}>{match.predictionCount || 0} participants</Text>
            </View>
          </View>
          {communityTrends.length > 0 ? (
            communityTrends.map((pred, index) => (
              <View key={index} style={styles.predictionRow}>
                <Text style={styles.predictionScore}>{pred.score}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${pred.percentage}%` }]} />
                </View>
                <Text style={styles.predictionPercentage}>{`${pred.percentage}% (${pred.count})`}</Text>
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
        visible={sharePromptVisible}
        onRequestClose={() => setSharePromptVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSharePromptVisible(false)}>
          <Pressable style={[styles.modalContent, styles.shareModalContent]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSharePromptVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#9ca3af" />
            </TouchableOpacity>
            <Ionicons name="logo-whatsapp" size={48} color="#25D366" style={styles.shareModalIcon} />
            <Text style={styles.shareModalTitle}>Partage WhatsApp obligatoire</Text>
            <Text style={styles.shareModalSubtitle}>
              Partagez le lien de l'application a vos contacts (2 partages necessaires) pour acceder aux pronostics.
            </Text>
            <View style={styles.shareModalLinkContainer}>
              <Text style={styles.shareModalLink}>{APP_SHARE_URL}</Text>
            </View>
            <View style={styles.shareModalProgress}>
              <View style={styles.shareProgressTrack}>
                <View style={[styles.shareProgressFill, { width: `${shareProgressPercent}%` }]} />
              </View>
              <Text style={styles.shareModalProgressLabel}>
                {hasCompletedShareRequirement
                  ? 'Objectif atteint !'
                  : `Encore ${remainingShares} partage${remainingShares > 1 ? 's' : ''} pour debloquer.`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.shareModalButton, isSharing && styles.buttonDisabled]}
              onPress={handleShareToWhatsApp}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.shareModalButtonContent}>
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <Text style={styles.shareModalButtonText}>Partager sur WhatsApp</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSharePromptVisible(false)}>
              <Text style={styles.shareModalSecondary}>Je partagerai plus tard</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
            <Text style={styles.modalSubtitle}>
              {match.teamA} vs {match.teamB}
            </Text>

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

            <TouchableOpacity
              style={[styles.modalSubmitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {currentUserPrediction ? 'Valider la modification' : 'Valider le pronostic'}
                </Text>
              )}
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
  finalScoreText: { color: '#111', fontSize: 36, fontWeight: 'bold', marginTop: 20 },

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
    width: 80, // Augmenté pour faire de la place
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
  shareButton: {
    backgroundColor: '#25D366',
  },
  shareRequirementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  shareRequirementTextContainer: {
    flex: 1,
  },
  shareRequirementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
  },
  shareRequirementSubtitle: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
  },
  shareProgressWrapper: {
    marginTop: 12,
    width: '100%',
  },
  shareProgressTrack: {
    height: 8,
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    overflow: 'hidden',
  },
  shareProgressFill: {
    height: '100%',
    backgroundColor: '#047857',
    borderRadius: 999,
  },
  shareProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  shareProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  shareProgressRemaining: {
    fontSize: 12,
    color: '#047857',
  },
  shareRequirementCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  shareRequirementCtaText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  shareModalContent: {
    alignItems: 'center',
  },
  shareModalIcon: {
    marginBottom: 12,
  },
  shareModalTitle: {
    color: '#111',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shareModalSubtitle: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  shareModalLinkContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  shareModalLink: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  shareModalProgress: {
    width: '100%',
    marginBottom: 20,
  },
  shareModalProgressLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#047857',
    textAlign: 'center',
  },
  shareModalButton: {
    backgroundColor: '#25D366',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareModalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareModalSecondary: {
    color: '#6b7280',
    fontSize: 14,
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
