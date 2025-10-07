// src/screens/PredictionGameScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// MODIFICATION: Importez les dependances pour les fonctions Firebase
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { collection, onSnapshot, query, where, doc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/StoreContext';
import { Prediction, Match, RootStackParamList } from '../types';

// MODIFICATION: Initialisez l'instance des Fonctions
const functions = getFunctions();
const APP_SHARE_URL = 'https://africaphone-africaphone.web.app/';
const WHATSAPP_SHARE_MESSAGE = `Rejoignez moi pour le match Classico 🔥⚽ BARÇA 🆚 REAL : Donne ton score exact et gagne GRATUITEMENT de téléphone chez *AFRICA PHONE* ! 📱🎯
La boutique de vente de téléphones à prix très réduits, *AFRICA PHONE*,
organise un grand jeu de pronostics pour te faire gagner gratuitement des téléphones ! 🎁

📲 Télécharge l’application *Africa Phone* et donne ton score exact pour tenter de gagner ton téléphone !

🔗 Lien de téléchargement : ${APP_SHARE_URL}
📞 Appel & WhatsApp : *01 54 15 15 22*

✨ Je viens de tenter ma chance, c’est 100 % gratuit et réel ! 😍`;
const REQUIRED_APP_SHARES = 2;
const LOCAL_SHARE_COUNT_KEY_PREFIX = 'local_app_share_count_v1';
const GUEST_PREDICTION_STORAGE_PREFIX = 'guest_prediction_v1';
const PENDING_PREDICTION_STORAGE_PREFIX = 'pending_prediction_v1';

type CurrentPredictionSummary = {
  id?: string;
  scoreA: number;
  scoreB: number;
  isWinner?: boolean;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  source: 'user' | 'guest';
};

type PendingSubmission = {
  scoreA: number;
  scoreB: number;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
};

const formatFullName = (first?: string | null, last?: string | null) => {
  const parts: string[] = [];
  if (first && first.trim().length > 0) {
    parts.push(first.trim());
  }
  if (last && last.trim().length > 0) {
    parts.push(last.trim());
  }
  return parts.join(' ').trim();
};

type PredictionGameRoute = RouteProp<RootStackParamList, 'PredictionGame'>;

const PredictionGameScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<PredictionGameRoute>();
  const { matchId } = route.params;
  const { user } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [predictionStep, setPredictionStep] = useState<'contact' | 'score'>('contact');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [guestPrediction, setGuestPrediction] = useState<CurrentPredictionSummary | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const [sharePromptVisible, setSharePromptVisible] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localShareCount, setLocalShareCount] = useState(0);
  const [pendingShareFeedback, setPendingShareFeedback] = useState(false);
  const [winners, setWinners] = useState<Prediction[]>([]);
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const localShareStorageKey = useMemo(
    () => `${LOCAL_SHARE_COUNT_KEY_PREFIX}_${matchId}_${user?.id ?? 'guest'}`,
    [matchId, user?.id]
  );

  useEffect(() => {
    let isMounted = true;
    setLocalShareCount(0);

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(localShareStorageKey);
        const parsed = raw ? parseInt(raw, 10) : 0;
        if (isMounted) {
          setLocalShareCount(Number.isFinite(parsed) ? parsed : 0);
        }
      } catch (e) {
        if (isMounted) {
          setLocalShareCount(0);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [localShareStorageKey]);

  useEffect(() => {
    let isMounted = true;

    const loadContactInformation = async () => {
      if (user) {
        const fullName = user.name?.trim() ?? '';
        const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];
        const fallbackFirst = nameParts[0] ?? '';
        const fallbackLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        const computedFirst = user.firstName ?? fallbackFirst;
        const computedLast = user.lastName ?? fallbackLast;

        if (isMounted) {
          setGuestPrediction(null);
          setContactFirstName(computedFirst);
          setContactLastName(computedLast);
          setContactNameInput(formatFullName(computedFirst, computedLast));
          setContactPhone(user.phoneNumber ?? '');
        }

        try {
          await AsyncStorage.removeItem(`${GUEST_PREDICTION_STORAGE_PREFIX}_${matchId}`);
        } catch (error) {
          console.warn('Impossible de supprimer le pronostic invite stocke', error);
        }
        return;
      }

      try {
        const key = `${GUEST_PREDICTION_STORAGE_PREFIX}_${matchId}`;
        const raw = await AsyncStorage.getItem(key);
        if (!isMounted) {
          return;
        }

        if (raw) {
          const parsed = JSON.parse(raw);
          setGuestPrediction({
            id: parsed.id,
            scoreA: parsed.scoreA,
            scoreB: parsed.scoreB,
            contactFirstName: parsed.contactFirstName,
            contactLastName: parsed.contactLastName,
            contactPhone: parsed.contactPhone,
            source: 'guest',
          });
          setContactFirstName(parsed.contactFirstName ?? '');
          setContactLastName(parsed.contactLastName ?? '');
          setContactNameInput(formatFullName(parsed.contactFirstName, parsed.contactLastName));
          setContactPhone(parsed.contactPhone ?? '');
        } else {
          setGuestPrediction(null);
          setContactFirstName('');
          setContactLastName('');
          setContactNameInput('');
          setContactPhone('');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du pronostic invite:', error);
        if (isMounted) {
          setGuestPrediction(null);
        }
      }
    };

    loadContactInformation();

    return () => {
      isMounted = false;
    };
  }, [user, matchId]);

  const currentPrediction = useMemo<CurrentPredictionSummary | null>(() => {
    if (user) {
      const authPrediction = predictions.find(p => p.userId === user.id);
      if (authPrediction) {
        return {
          id: authPrediction.id,
          scoreA: authPrediction.scoreA,
          scoreB: authPrediction.scoreB,
          isWinner: authPrediction.isWinner,
          contactFirstName: authPrediction.contactFirstName,
          contactLastName: authPrediction.contactLastName,
          contactPhone: authPrediction.contactPhone,
          source: 'user',
        };
      }
      return null;
    }
    return guestPrediction;
  }, [user, predictions, guestPrediction]);

  useEffect(() => {
    if (!currentPrediction) {
      return;
    }
    const first = currentPrediction.contactFirstName ?? '';
    const last = currentPrediction.contactLastName ?? '';
    setContactFirstName(first);
    setContactLastName(last);
    setContactNameInput(formatFullName(first, last));
    if (currentPrediction.contactPhone) {
      setContactPhone(currentPrediction.contactPhone);
    }
  }, [currentPrediction]);

  useEffect(() => {
    let isMounted = true;

    const syncPendingDraft = async () => {
      const draftKey = `${PENDING_PREDICTION_STORAGE_PREFIX}_${matchId}`;

      if (currentPrediction) {
        try {
          await AsyncStorage.removeItem(draftKey);
        } catch (error) {
          console.warn('Impossible de supprimer le brouillon de pronostic', error);
        }
        if (isMounted) {
          setPendingSubmission(null);
          setSharePromptVisible(false);
        }
        return;
      }

      try {
        const rawDraft = await AsyncStorage.getItem(draftKey);
        if (!isMounted) {
          return;
        }

        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          const draftScoreA = typeof parsed.scoreA === 'number' ? parsed.scoreA : parseInt(parsed.scoreA, 10);
          const draftScoreB = typeof parsed.scoreB === 'number' ? parsed.scoreB : parseInt(parsed.scoreB, 10);

          if (!Number.isNaN(draftScoreA) && !Number.isNaN(draftScoreB)) {
            const draft: PendingSubmission = {
              scoreA: draftScoreA,
              scoreB: draftScoreB,
              contactFirstName: parsed.contactFirstName ?? '',
              contactLastName: parsed.contactLastName ?? '',
              contactPhone: parsed.contactPhone ?? '',
            };
            setPendingSubmission(draft);
            setSharePromptVisible(true);
            setScoreA(String(draft.scoreA));
            setScoreB(String(draft.scoreB));
            setContactFirstName(draft.contactFirstName);
            setContactLastName(draft.contactLastName);
            setContactNameInput(formatFullName(draft.contactFirstName, draft.contactLastName));
            setContactPhone(draft.contactPhone);
          }
        } else {
          setPendingSubmission(null);
          setSharePromptVisible(false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du brouillon de pronostic:', error);
      }
    };

    syncPendingDraft();

    return () => {
      isMounted = false;
    };
  }, [currentPrediction, matchId]);

  const effectiveShareCount = Math.min(localShareCount || 0, REQUIRED_APP_SHARES);
  const shareProgressRatio = Math.min(effectiveShareCount / REQUIRED_APP_SHARES, 1);
  const shareProgressPercent = Math.round(shareProgressRatio * 100);
  const remainingShares = Math.max(REQUIRED_APP_SHARES - effectiveShareCount, 0);
  const hasCompletedShareRequirement = shareProgressRatio >= 1;

  const modalContainerStyle = useMemo(
    () => [
      styles.modalBackdrop,
      { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
      keyboardVisible && styles.modalBackdropShift,
    ],
    [insets.bottom, insets.top, keyboardVisible]
  );

  const handleShareToWhatsApp = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_SHARE_MESSAGE)}`;
    setIsSharing(true);
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (!canOpen) {
        throw new Error('WhatsApp non disponible');
      }
      setPendingShareFeedback(true);
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      console.error('Erreur de partage WhatsApp: ', error);
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. Reessayez.");
      setPendingShareFeedback(false);
    } finally {
      setIsSharing(false);
    }
  };

  const applyShareProgress = useCallback(async () => {
    const before = Math.min(localShareCount || 0, REQUIRED_APP_SHARES);
    if (before >= REQUIRED_APP_SHARES) {
      setPendingShareFeedback(false);
      return;
    }

    const after = Math.min(before + 1, REQUIRED_APP_SHARES);

    try {
      await AsyncStorage.setItem(localShareStorageKey, String(after));
    } catch (err) {
      console.error('Erreur stockage progression partage:', err);
    }
    setLocalShareCount(after);

    const remainingAfterShare = Math.max(REQUIRED_APP_SHARES - after, 0);

    if (remainingAfterShare > 0) {
      Alert.alert(
        'Merci !',
        `Merci d'avoir partage l'application. Encore ${remainingAfterShare} partage${remainingAfterShare > 1 ? 's' : ''} pour valider (objectif 10 personnes).`
      );
    } else if (pendingSubmission) {
      await submitPrediction(pendingSubmission);
    } else {
      Alert.alert('Merci !', "Merci d'avoir partage l'application. Vous pouvez maintenant pronostiquer.");
    }

    setPendingShareFeedback(false);
  }, [localShareCount, localShareStorageKey, pendingSubmission, submitPrediction]);

  const matchStarted = useMemo(() => {
    if (!match) return true;
    const GRACE_PERIOD_MS = 60 * 1000;
    const cutOffTime = match.startTime.toDate().getTime() - GRACE_PERIOD_MS;
    return new Date().getTime() > cutOffTime;
  }, [match]);

  // Applique la progression de partage lorsque l'utilisateur revient depuis WhatsApp
  useFocusEffect(
    useCallback(() => {
      if (pendingShareFeedback) {
        applyShareProgress();
      }
    }, [pendingShareFeedback, applyShareProgress])
  );

  const handleViewWinners = useCallback(() => {
    if (!match) {
      return;
    }
    navigation.navigate('MatchWinners', {
      matchId,
      teamA: match.teamA,
      teamAFlag: match.teamALogo ?? null,
      teamB: match.teamB,
      teamBFlag: match.teamBLogo ?? null,
      finalScoreA: typeof match.finalScoreA === 'number' ? match.finalScoreA : null,
      finalScoreB: typeof match.finalScoreB === 'number' ? match.finalScoreB : null,
    });
  }, [navigation, match, matchId]);

  const matchEnded = useMemo(() => {
    if (!match) return false;
    return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  }, [match]);

  useEffect(() => {
    if (!matchEnded || !matchId) {
      setWinners([]);
      setIsLoadingWinners(false);
      return;
    }

    setIsLoadingWinners(true);
    const predictionsRef = collection(db, 'predictions');
    const winnersQuery = query(predictionsRef, where('matchId', '==', matchId), where('isWinner', '==', true));

    const unsubscribe = onSnapshot(
      winnersQuery,
      snapshot => {
        const list: Prediction[] = [];
        snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Prediction);
        });
        setWinners(list);
        setIsLoadingWinners(false);
      },
      error => {
        console.error('Erreur de lecture des gagnants:', error);
        setIsLoadingWinners(false);
      }
    );

    return () => unsubscribe();
  }, [matchEnded, matchId]);

  const hasWinners = winners.length > 0;

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
        setLoading(false);
      },
      error => {
        console.error('Erreur de lecture du match: ', error);
        setLoading(false);
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
          console.error('Erreur de lecture du Pronostic utilisateur: ', error);
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
    if (currentPrediction) {
      Alert.alert('Pronostic deja enregistre', 'Il ne peut plus etre modifie.');
      return;
    }

    let updatedFirst = contactFirstName;
    let updatedLast = contactLastName;

    if (user) {
      const fullName = user.name?.trim() ?? '';
      const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];
      const fallbackFirst = nameParts[0] ?? '';
      const fallbackLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      if (!contactFirstName) {
        updatedFirst = user.firstName ?? fallbackFirst;
        setContactFirstName(updatedFirst);
      }
      if (!contactLastName) {
        updatedLast = user.lastName ?? fallbackLast;
        setContactLastName(updatedLast);
      }
      if (!contactPhone) {
        setContactPhone(user.phoneNumber ?? '');
      }
    }

    setContactNameInput(formatFullName(updatedFirst, updatedLast));

    // Toujours afficher d'abord l'étape d'informations de contact
    setPredictionStep('contact');
    setModalVisible(true);
  };

  const submitPrediction = useCallback(
    async (submissionData: PendingSubmission) => {
      const draftKey = `${PENDING_PREDICTION_STORAGE_PREFIX}_${matchId}`;
      setIsSubmitting(true);
      try {
        const submitPredictionFn = httpsCallable(functions, 'submitPrediction');
        const payload = {
          matchId,
          scoreA: submissionData.scoreA,
          scoreB: submissionData.scoreB,
          predictionId: currentPrediction?.id,
          contactFirstName: submissionData.contactFirstName,
          contactLastName: submissionData.contactLastName,
          contactPhone: submissionData.contactPhone,
        };

        const result = await submitPredictionFn(payload);
        const data = result.data as { success: boolean; message: string; predictionId?: string };

        Alert.alert(data.success ? 'Succes' : 'Erreur', data.message);

        if (data.success) {
          if (!user) {
            const newGuestPrediction: CurrentPredictionSummary = {
              id: data.predictionId ?? currentPrediction?.id,
              scoreA: submissionData.scoreA,
              scoreB: submissionData.scoreB,
              contactFirstName: submissionData.contactFirstName,
              contactLastName: submissionData.contactLastName,
              contactPhone: submissionData.contactPhone,
              source: 'guest',
            };
            setGuestPrediction(newGuestPrediction);
            try {
              await AsyncStorage.setItem(
                `${GUEST_PREDICTION_STORAGE_PREFIX}_${matchId}`,
                JSON.stringify({
                  id: newGuestPrediction.id,
                  scoreA: newGuestPrediction.scoreA,
                  scoreB: newGuestPrediction.scoreB,
                  contactFirstName: newGuestPrediction.contactFirstName,
                  contactLastName: newGuestPrediction.contactLastName,
                  contactPhone: newGuestPrediction.contactPhone,
                })
              );
            } catch (storageError) {
              console.warn("Impossible d'enregistrer le pronostic invite localement", storageError);
            }
          }

          try {
            await AsyncStorage.removeItem(draftKey);
          } catch (draftError) {
            console.warn('Impossible de supprimer le brouillon de pronostic', draftError);
          }
          try {
            await AsyncStorage.removeItem(localShareStorageKey);
          } catch (shareError) {
            console.warn('Impossible de supprimer la progression de partage', shareError);
          }
          setLocalShareCount(0);
          setPendingSubmission(null);
          setSharePromptVisible(false);

          setContactFirstName(submissionData.contactFirstName);
          setContactLastName(submissionData.contactLastName);
          setContactNameInput(formatFullName(submissionData.contactFirstName, submissionData.contactLastName));
          setContactPhone(submissionData.contactPhone);
          setScoreA('');
          setScoreB('');
          setModalVisible(false);
        }
      } catch (error: unknown) {
        console.error("Erreur d'enregistrement du Pronostic: ", error);
        const message = error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez reessayer.';
        Alert.alert('Erreur', message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [matchId, currentPrediction?.id, user, localShareStorageKey]
  );

  const handleSubmit = async () => {
    if (currentPrediction) {
      Alert.alert('Pronostic deja enregistre', 'Il ne peut plus etre modifie.');
      return;
    }
    if (matchStarted) {
      Alert.alert('Trop tard !', 'Les Pronostics pour ce match sont termines.');
      return;
    }
    if (!scoreA.trim() || !scoreB.trim()) {
      Alert.alert('Score incomplet', 'Veuillez entrer un score pour les deux equipes.');
      return;
    }

    const trimmedFirst = contactFirstName.trim();
    const trimmedLast = contactLastName.trim();
    const trimmedPhone = contactPhone.trim();
    const normalizedPhone = trimmedPhone.replace(/\D+/g, '');

    if (!trimmedFirst || !trimmedLast || !trimmedPhone) {
      Alert.alert('Informations requises', 'Merci de renseigner votre Nom et Prenom ainsi que votre Numero WhatsApp.');
      return;
    }
    if (normalizedPhone.length < 6) {
      Alert.alert('Numero invalide', 'Le Numero WhatsApp fourni est invalide.');
      return;
    }

    const parsedScoreA = parseInt(scoreA, 10);
    const parsedScoreB = parseInt(scoreB, 10);
    if (Number.isNaN(parsedScoreA) || Number.isNaN(parsedScoreB)) {
      Alert.alert('Score invalide', 'Veuillez saisir des scores valides.');
      return;
    }

    const submissionData: PendingSubmission = {
      scoreA: parsedScoreA,
      scoreB: parsedScoreB,
      contactFirstName: trimmedFirst,
      contactLastName: trimmedLast,
      contactPhone: trimmedPhone,
    };

    if (!hasCompletedShareRequirement) {
      setPendingSubmission(submissionData);
      setSharePromptVisible(true);
      try {
        await AsyncStorage.setItem(`${PENDING_PREDICTION_STORAGE_PREFIX}_${matchId}`, JSON.stringify(submissionData));
      } catch (error) {
        console.warn("Impossible d'enregistrer le brouillon de pronostic", error);
      }
      setModalVisible(false);
      setPredictionStep('contact');
      return;
    }

    await submitPrediction(submissionData);
  };

  const renderResultCard = () => {
    if (!matchEnded) return null;

    const predictionLabel = currentPrediction ? `${currentPrediction.scoreA} - ${currentPrediction.scoreB}` : null;

    return (
      <View style={[styles.resultCard, styles.neutralCard]}>
        <Ionicons name="information-circle-outline" size={24} color="#4b5563" />
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultTitle}>Match terminé</Text>
          {predictionLabel && <Text style={styles.resultSubtitle}>Votre pronostic : {predictionLabel}</Text>}
        </View>
      </View>
    );
  };

  const handleContactNameChange = (text: string) => {
    setContactNameInput(text);
    const normalized = text.trim();
    if (!normalized) {
      setContactFirstName('');
      setContactLastName('');
      return;
    }

    const [first, ...rest] = normalized.split(/\s+/);
    setContactFirstName(first ?? '');
    setContactLastName(rest.join(' '));
  };

  const handleContactNext = () => {
    const trimmedFirst = contactFirstName.trim();
    const trimmedLast = contactLastName.trim();
    const trimmedPhone = contactPhone.trim();
    const normalizedPhone = trimmedPhone.replace(/\D+/g, '');

    if (!trimmedFirst || !trimmedLast || !trimmedPhone) {
      Alert.alert('Informations requises', 'Merci de renseigner votre Nom et Prénom ainsi que votre Numéro WhatsApp.');
      return;
    }
    if (normalizedPhone.length < 6) {
      Alert.alert('Numéro invalide', 'Le Numéro WhatsApp fourni est invalide.');
      return;
    }
    // Passe a l'étape de saisie du score
    setPredictionStep('score');
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
    if (pendingSubmission && !hasCompletedShareRequirement) {
      return null;
    }
    if (pendingSubmission && isSubmitting) {
      return (
        <View style={[styles.submitButton, styles.buttonDisabled]}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.submitButtonText}>Validation en cours...</Text>
        </View>
      );
    }
    if (currentPrediction) {
      return (
        <View style={[styles.submitButton, styles.buttonDisabled]}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Pronostic validé</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity style={styles.submitButton} onPress={handleOpenModal}>
        <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
        <Text style={styles.submitButtonText}>Placer mon Pronostic</Text>
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
          <Text style={styles.headerTitle}>Pronostics Football - Africaphone</Text>
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
          <Text style={styles.emptySubText}>Ce match n&apos;existe pas ou a été supprimé.</Text>
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
        <Text style={styles.headerTitle}>Pronostics Football - Africaphone</Text>
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

        {matchEnded && (
          <View style={styles.winnersSection}>
            <View style={styles.winnersSectionHeader}>
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
              <View style={styles.winnersSectionText}>
                <Text style={styles.winnersTitle}>Gagnants du match</Text>
                <Text style={styles.winnersSubtitle}>
                  {isLoadingWinners
                    ? 'Chargement des gagnants...'
                    : hasWinners
                      ? `${winners.length} gagnant${winners.length > 1 ? 's' : ''} ont trouve le bon score.`
                      : 'Aucun gagnant pour ce match.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.winnersButton, (isLoadingWinners || !hasWinners) && styles.winnersButtonDisabled]}
              onPress={handleViewWinners}
              disabled={isLoadingWinners || !hasWinners}
            >
              {isLoadingWinners ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="eye-outline" size={18} color="#fff" />
                  <Text style={styles.winnersButtonText}>Voir les gagnants</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {sharePromptVisible && pendingSubmission && !hasCompletedShareRequirement && (
          <View style={styles.shareBanner}>
            <View style={styles.shareBannerTextWrapper}>
              <Text style={styles.shareBannerTitle}>Partager pour valider votre pronostique</Text>
              <Text style={styles.shareBannerSubtitle}>
                Partagez le lien de l&apos;application a 10 personnes (minimum {REQUIRED_APP_SHARES} partages requis).
              </Text>
            </View>
            <View style={styles.shareProgressTrack}>
              <View style={[styles.shareProgressFill, { width: `${shareProgressPercent}%` }]} />
            </View>
            <Text style={styles.shareProgressHint}>
              {remainingShares > 0
                ? `Encore ${remainingShares} partage${remainingShares > 1 ? 's' : ''} pour valider (objectif 10 personnes).`
                : 'Objectif atteint ! Merci pour le partage.'}
            </Text>
            <TouchableOpacity
              style={[styles.shareBannerCta, isSharing && styles.buttonDisabled]}
              onPress={handleShareToWhatsApp}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={styles.shareBannerCtaText}>Partager maintenant</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {currentPrediction && !matchEnded && (
          <View style={styles.votedCard}>
            <Text style={styles.votedTitle}>Votre pronostic actuel</Text>
            <Text style={styles.votedScore}>{`${currentPrediction.scoreA} - ${currentPrediction.scoreB}`}</Text>
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
            <Text style={styles.noPredictionsText}>Soyez le premier a faire un pronostic !</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={modalContainerStyle}
          onPress={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}
        >
          <Pressable style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                Keyboard.dismiss();
                setModalVisible(false);
              }}
            >
              <Ionicons name="close-circle" size={28} color="#9ca3af" />
            </TouchableOpacity>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={insets.top + 24}
              style={{ width: '100%' }}
            >
              <ScrollView
                contentContainerStyle={styles.modalInner}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              >
                {predictionStep === 'contact' ? (
                  <>
                    <Text style={styles.modalTitle}>Vos informations</Text>
                    <Text style={styles.modalSubtitle}>Renseignez vos informations de contact</Text>
                    <View style={styles.contactFieldsContainer}>
                      <TextInput
                        style={styles.contactInput}
                        autoCapitalize="words"
                        value={contactNameInput}
                        onChangeText={handleContactNameChange}
                        placeholder="Nom & Prénom"
                        placeholderTextColor="#9ca3af"
                        textContentType="name"
                        returnKeyType="next"
                      />
                      <TextInput
                        style={[styles.contactInput, styles.contactInputLast]}
                        keyboardType="phone-pad"
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder="Numéro WhatsApp"
                        placeholderTextColor="#9ca3af"
                        textContentType="telephoneNumber"
                      />
                    </View>
                    <TouchableOpacity style={styles.modalSubmitButton} onPress={handleContactNext}>
                      <Text style={styles.modalSubmitText}>Continuer</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Votre Pronostic</Text>
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
                        <Text style={styles.modalSubmitText}>Continuer</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
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
  neutralCard: {
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
    paddingHorizontal: 16,
  },
  modalBackdropShift: {
    justifyContent: 'flex-start',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalInner: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
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
  contactFieldsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  contactInput: {
    backgroundColor: '#f2f3f5',
    borderRadius: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
  },
  contactInputLast: { marginBottom: 0 },
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
  winnersSection: {
    width: '100%',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  winnersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  winnersSectionText: {
    flex: 1,
  },
  winnersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  winnersSubtitle: {
    fontSize: 13,
    color: '#b45309',
  },
  winnersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 999,
    paddingVertical: 10,
  },
  winnersButtonDisabled: {
    backgroundColor: '#fb923c',
    opacity: 0.6,
  },
  winnersButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  shareBanner: {
    backgroundColor: '#ecfdf3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  shareBannerTextWrapper: {
    gap: 4,
  },
  shareBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
  },
  shareBannerSubtitle: {
    fontSize: 13,
    color: '#047857',
  },
  shareProgressHint: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  shareBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
  },
  shareBannerCtaText: {
    color: '#fff',
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
