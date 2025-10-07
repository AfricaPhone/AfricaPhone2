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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// MODIFICATION: Importez les dependances pour les fonctions Firebase
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { collection, onSnapshot, query, where, doc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/StoreContext';
import { Prediction, Match } from '../types';

// MODIFICATION: Initialisez l'instance des Fonctions
const functions = getFunctions();
const openWhatsApp = async () => {
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_SHARE_MESSAGE)}`;
  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert("WhatsApp non disponible", "Impossible d'ouvrir WhatsApp sur cet appareil.");
    }
  } catch (err) {
    Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. Reessayez.");
  }
};

const APP_SHARE_URL = 'https://africaphone.app';
const WHATSAPP_SHARE_MESSAGE = `Rejoins-moi sur AfricaPhone pour pronostiquer et tenter ta chance ! Telecharge l'application ici : ${APP_SHARE_URL}`;
const REQUIRED_APP_SHARES = 2;
const LOCAL_SHARE_COUNT_KEY = 'local_app_share_count_v1';
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

const PredictionGameScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params as { matchId: string };
  const { user, updateUserProfile } = useStore();

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

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePromptVisible, setSharePromptVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localShareCount, setLocalShareCount] = useState(0);
  const [pendingShareFeedback, setPendingShareFeedback] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  }, [currentPrediction?.id]);

  useEffect(() => {
    let isMounted = true;

    const syncPendingDraft = async () => {
      const draftKey = `${PENDING_PREDICTION_STORAGE_PREFIX}_${matchId}`;

      if (currentPrediction) {
        try {
          await AsyncStorage.removeItem(draftKey);
        } catch (error) {
          console.warn("Impossible de supprimer le brouillon de pronostic", error);
        }
        if (isMounted) {
          setPendingSubmission(null);
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
            setScoreA(String(draft.scoreA));
            setScoreB(String(draft.scoreB));
            setContactFirstName(draft.contactFirstName);
            setContactLastName(draft.contactLastName);
            setContactNameInput(formatFullName(draft.contactFirstName, draft.contactLastName));
            setContactPhone(draft.contactPhone);
          }
        } else {
          setPendingSubmission(null);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du brouillon de pronostic:', error);
      }
    };

    syncPendingDraft();

    return () => {
      isMounted = false;
    };
  }, [currentPrediction?.id, matchId]);

  const userShareCount = user?.appShareCount ?? (user?.hasSharedApp ? REQUIRED_APP_SHARES : 0);
  const effectiveShareCount = Math.max(userShareCount || 0, localShareCount || 0);
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

  // Fermer automatiquement la modale de partage dès que l'objectif est atteint
  useEffect(() => {
    if (hasCompletedShareRequirement && sharePromptVisible) {
      setSharePromptVisible(false);
    }
  }, [hasCompletedShareRequirement, sharePromptVisible]);

  const openSharePromptAndIncrement = async () => {
  // Au clic: incrémente (local ou profil), marque un feedback en attente, puis ouvre WhatsApp directement
  if (!user) {
    const newLocal = Math.min((localShareCount ?? 0) + 1, REQUIRED_APP_SHARES);
    try {
      await AsyncStorage.setItem(LOCAL_SHARE_COUNT_KEY, String(newLocal));
      setLocalShareCount(newLocal);
    } catch (_) {
      setLocalShareCount(newLocal);
    }
    setPendingShareFeedback(true);
    await openWhatsApp();
    return;
  }
  const updatedShareCount = Math.min((userShareCount ?? 0) + 1, REQUIRED_APP_SHARES);
  try {
    await updateUserProfile({
      appShareCount: updatedShareCount,
      hasSharedApp: updatedShareCount >= REQUIRED_APP_SHARES,
      lastAppShareAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de l'incrément du partage:", error);
  }
  setPendingShareFeedback(true);
  await openWhatsApp();
};

  const handleShareToWhatsApp = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_SHARE_MESSAGE)}`;
    setIsSharing(true);
    try {
      // Incrémenter immédiatement le compteur pour un rendu 100% réactif
      const before = Math.min(Math.max(userShareCount || 0, localShareCount || 0), REQUIRED_APP_SHARES);
      const after = Math.min(before + 1, REQUIRED_APP_SHARES);
      if (!user) {
        const newLocal = after;
        try {
          await AsyncStorage.setItem(LOCAL_SHARE_COUNT_KEY, String(newLocal));
        } catch (_) {
          // ignore storage error
        }
        // Répercuter localement pour l'affichage
        setLocalShareCount(newLocal);
      } else {
        try {
          await updateUserProfile({
            appShareCount: after,
            hasSharedApp: after >= REQUIRED_APP_SHARES,
            lastAppShareAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Erreur lors de l'incrément du partage:", e);
        }
        // Optimistic UI: refléter tout de suite côté local
        setLocalShareCount(prev => Math.max(prev, after));
      }

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      }

      setSharePromptVisible(false);
      const remainingAfterShare = Math.max(REQUIRED_APP_SHARES - after, 0);
      const successMessage =
        remainingAfterShare > 0
          ? `Merci d'avoir partagé l'application. Encore ${remainingAfterShare} partage${remainingAfterShare > 1 ? 's' : ''} pour debloquer les Pronostics.`
          : `Merci d'avoir partagé l'application. Vous pouvez maintenant pronostiquer.`;
      Alert.alert('Merci !', successMessage);
    } catch (error) {
      console.error('Erreur de partage WhatsApp: ', error);
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp. Reessayez.");
    } finally {
      setIsSharing(false);
    }
  };

  const resetShareProgressDev = () => {
    if (!__DEV__) {
      return;
    }
    Alert.alert(
      'Réinitialiser',
      'Remettre la progression de partage à 0 ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(LOCAL_SHARE_COUNT_KEY);
              // Remet l'état local à 0
              // (l'écran recalculera automatiquement le pourcentage)
              if (typeof setLocalShareCount === 'function') {
                setLocalShareCount(0);
              }
              if (user) {
                await updateUserProfile({ appShareCount: 0, hasSharedApp: false });
              }
              Alert.alert('OK', 'Progression réinitialisée.');
            } catch (e) {
              console.error('Erreur reset progression:', e);
              Alert.alert('Erreur', 'Impossible de réinitialiser.');
            }
          },
        },
      ]
    );
  };

  const matchStarted = useMemo(() => {
    if (!match) return true;
    const GRACE_PERIOD_MS = 60 * 1000;
    const cutOffTime = match.startTime.toDate().getTime() - GRACE_PERIOD_MS;
    return new Date().getTime() > cutOffTime;
  }, [match]);

  
  // Au retour sur cet écran après ouverture de WhatsApp, afficher le feedback (modal avec progression)
  useFocusEffect(
    useCallback(() => {
      if (pendingShareFeedback) {
        setSharePromptVisible(true);
        setPendingShareFeedback(false);
      }
    }, [pendingShareFeedback])
  );const matchEnded = useMemo(() => {
    if (!match) return false;
    return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  }, [match]);

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
            console.warn("Impossible de supprimer le brouillon de pronostic", draftError);
          }
          setPendingSubmission(null);

          setContactFirstName(submissionData.contactFirstName);
          setContactLastName(submissionData.contactLastName);
          setContactNameInput(formatFullName(submissionData.contactFirstName, submissionData.contactLastName));
          setContactPhone(submissionData.contactPhone);
          setScoreA('');
          setScoreB('');
          setModalVisible(false);
        }
      } catch (error: any) {
        console.error("Erreur d'enregistrement du Pronostic: ", error);
        Alert.alert('Erreur', error.message || 'Une erreur est survenue. Veuillez reessayer.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [matchId, currentPrediction?.id, user]
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
      try {
        await AsyncStorage.setItem(
          `${PENDING_PREDICTION_STORAGE_PREFIX}_${matchId}`,
          JSON.stringify(submissionData)
        );
      } catch (error) {
        console.warn("Impossible d'enregistrer le brouillon de pronostic", error);
      }
      setSharePromptVisible(true);
      Alert.alert('Partage requis', "Partagez d'abord l'application sur WhatsApp pour finaliser votre pronostic.");
      return;
    }

    await submitPrediction(submissionData);
  };

  const renderResultCard = () => {
    if (!matchEnded || !currentPrediction) return null;

    if (currentPrediction.isWinner) {
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
            Votre Pronostic : {currentPrediction.scoreA} - {currentPrediction.scoreB}
          </Text>
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
    // Passe à l'étape de saisie du score
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
    if (currentPrediction) {
      return (
        <View style={[styles.submitButton, styles.buttonDisabled]}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Pronostic enregistre</Text>
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
                {pendingSubmission
                  ? "Partagez l'application via WhatsApp (2 partages necessaires) pour finaliser votre pronostic."
                  : "Partagez l'application via WhatsApp (2 partages necessaires) pour debloquer les pronostics."}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.shareRequirementCta}
              onPress={openSharePromptAndIncrement}
              onLongPress={resetShareProgressDev}
              delayLongPress={800}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.shareRequirementCtaText}>Partager</Text>
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
        visible={sharePromptVisible}
        onRequestClose={() => setSharePromptVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
          onPress={() => setSharePromptVisible(false)}
        >
          <Pressable style={[styles.modalContent, styles.shareModalContent]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSharePromptVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#9ca3af" />
            </TouchableOpacity>
            <Ionicons name="logo-whatsapp" size={48} color="#25D366" style={styles.shareModalIcon} />
            <Text style={styles.shareModalTitle}>Partage WhatsApp obligatoire</Text>
            <Text style={styles.shareModalSubtitle}>
              {pendingSubmission
                ? "Partagez le lien de l'application pour finaliser votre pronostic en attente (2 partages necessaires)."
                : "Partagez le lien de l'application a vos contacts (2 partages necessaires) pour acceder aux Pronostics."}
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
            {!hasCompletedShareRequirement && (
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
            )}
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
                        autoCapitalize='words'
                        value={contactNameInput}
                        onChangeText={handleContactNameChange}
                        placeholder='Nom & Prénom'
                        placeholderTextColor='#9ca3af'
                        textContentType='name'
                        returnKeyType='next'
                      />
                      <TextInput
                        style={[styles.contactInput, styles.contactInputLast]}
                        keyboardType='phone-pad'
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder='Numéro WhatsApp'
                        placeholderTextColor='#9ca3af'
                        textContentType='telephoneNumber'
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
                        <Text style={styles.modalSubmitText}>Valider le pronostic</Text>
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

