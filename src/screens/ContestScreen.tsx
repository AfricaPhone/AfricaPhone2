// src/screens/ContestScreen.tsx
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  TextInput,
  StatusBar,
  Animated,
  Keyboard,
  BackHandler, // AJOUT
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native'; // AJOUT
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Candidate, RootStackParamList } from '../types';
import ContestCountdown from '../components/ContestCountdown';
import VoteConfirmationModal from '../components/VoteConfirmationModal';
import { useKkiapay } from '@kkiapay-org/react-native-sdk';
import { PAYMENT_CONFIG } from '../config/payment';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useStore } from '../store/StoreContext';
import { useContestData } from '../hooks/useContestData';
import { fetchActiveContestId } from '../services/contestService';
// Plus de persistance locale ici; le serveur compte les votes

type PaymentResult = {
  transactionId?: string;
  transaction_id?: string;
  transactionID?: string;
  status?: string;
  message?: string;
};

const formatNumber = (num: number) => new Intl.NumberFormat('fr-FR').format(num);

const CandidateCard: React.FC<{
  item: Candidate;
  totalVotes: number;
  onVote: (c: Candidate) => void;
  disabled?: boolean;
}> = ({ item, totalVotes, onVote, disabled = false }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const percentage = totalVotes > 0 ? (item.voteCount / totalVotes) * 100 : 0;
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedWidth]);

  return (
    <TouchableOpacity
      style={styles.candidateCard}
      onPress={() => navigation.navigate('CandidateProfile', { candidate: item })}
    >
      <Image source={{ uri: item.photoUrl }} style={styles.candidatePhoto} />
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateName}>{item.name}</Text>
        <Text style={styles.candidateMedia}>{item.media}</Text>
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.candidateVotes}>{formatNumber(item.voteCount)} votes</Text>
      </View>
      <TouchableOpacity
        style={[styles.voteButton, disabled ? styles.voteButtonDisabled : null]}
        onPress={() => onVote(item)}
        disabled={disabled}
      >
        <Text style={styles.voteButtonText}>Voter</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const ContestScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const { user } = useStore();
  const { openKkiapayWidget, addSuccessListener, addFailedListener, addPendingListener } = useKkiapay();
  const functionsInstance = useMemo(() => getFunctions(undefined, PAYMENT_CONFIG.FUNCTIONS_REGION), []);

  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const route = useRoute<RouteProp<RootStackParamList, 'Contest'>>();
  const routeContestId = route.params?.contestId ?? null;
  const [contestId, setContestId] = useState<string | null>(routeContestId);
  const [isResolvingContestId, setIsResolvingContestId] = useState(!routeContestId);
  const [contestIdError, setContestIdError] = useState<string | null>(null);

  useEffect(() => {
    if (routeContestId) {
      setContestId(routeContestId);
      setContestIdError(null);
      setIsResolvingContestId(false);
      return;
    }

    let isMounted = true;
    const resolveActiveContest = async () => {
      setIsResolvingContestId(true);
      setContestId(null);
      setContestIdError(null);
      try {
        const activeContestId = await fetchActiveContestId();
        if (!isMounted) {
          return;
        }
        if (activeContestId) {
          setContestId(activeContestId);
        } else {
          setContestIdError('Aucun concours actif pour le moment.');
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Impossible de charger le concours.';
        setContestIdError(message);
      } finally {
        if (isMounted) {
          setIsResolvingContestId(false);
        }
      }
    };

    resolveActiveContest();

    return () => {
      isMounted = false;
    };
  }, [routeContestId]);

  const { contest, candidates, isLoading, error } = useContestData(contestId);

  const isBusy = isLoading || isResolvingContestId || isPreparingPayment;

  const filteredCandidates = useMemo(() => {
    const src = Array.isArray(candidates) ? candidates : [];
    const term = (searchQuery || '').trim().toLowerCase();
    const filtered = term
      ? src.filter(c => (c.name || '').toLowerCase().includes(term) || (c.media || '').toLowerCase().includes(term))
      : src;
    // Always show by voteCount desc
    return [...filtered].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  }, [candidates, searchQuery]);

  const totalVotes = useMemo(() => {
    if (contest && typeof contest.totalVotes === 'number') {
      return contest.totalVotes;
    }
    return (Array.isArray(candidates) ? candidates : []).reduce(
      (sum, c) => sum + (typeof c.voteCount === 'number' ? c.voteCount : 0),
      0
    );
  }, [contest, candidates]);

  const errorMessage = useMemo(() => contestIdError || error || null, [contestIdError, error]);

  const totalParticipants = useMemo(() => {
    if (contest && typeof contest.totalParticipants === 'number' && contest.totalParticipants > 0) {
      return contest.totalParticipants;
    }
    return Array.isArray(candidates) ? candidates.length : 0;
  }, [contest, candidates]);

  useEffect(() => {
    const successUnsubscribe = addSuccessListener(async (data?: PaymentResult) => {
      try {
        const txId: string = String(data?.transactionId || data?.transaction_id || data?.transactionID || '');
        if (!txId) {
          setPaymentStatus('failed');
          setPaymentMessage('Transaction sans identifiant.');
          setSelectedCandidate(pendingCandidate ?? null);
          setModalVisible(true);
          setPendingCandidate(null);
          setHasVoted(false);
          return;
        }

        setLastTransactionId(txId);
        setPaymentStatus('success');
        setPaymentMessage('Votre vote a ete pris en compte.');

        try {
          const fn = httpsCallable(functionsInstance, 'verifyKkiapay');
          await fn({ transactionId: txId });
        } catch (e) {
          // Le webhook effectue la mise a jour definitive
        }

        setSelectedCandidate(pendingCandidate ?? null);
        setModalVisible(true);
        setPendingCandidate(null);
        setHasVoted(true);
      } catch (err: unknown) {
        setPaymentStatus('failed');
        const message = err instanceof Error ? err.message : 'Impossible de finaliser le vote.';
        setPaymentMessage(message);
        setSelectedCandidate(pendingCandidate ?? null);
        setModalVisible(true);
        setPendingCandidate(null);
        setHasVoted(false);
      }
    });

    const failedUnsubscribe = addFailedListener((data?: PaymentResult) => {
      const txId = data?.transactionId ? String(data.transactionId) : null;
      if (txId) {
        setLastTransactionId(txId);
      }
      setPaymentStatus('failed');
      setPaymentMessage("Votre paiement n'a pas abouti.");
      setSelectedCandidate(pendingCandidate ?? null);
      setModalVisible(true);
      setPendingCandidate(null);
      setHasVoted(false);
    });

    const pendingUnsubscribe = addPendingListener(() => {
      // Optionnel: afficher un etat "paiement en cours"
    });

    return () => {
      if (typeof successUnsubscribe === 'function') {
        successUnsubscribe();
      }
      if (typeof failedUnsubscribe === 'function') {
        failedUnsubscribe();
      }
      if (typeof pendingUnsubscribe === 'function') {
        pendingUnsubscribe();
      }
    };
  }, [addSuccessListener, addFailedListener, addPendingListener, pendingCandidate, functionsInstance]);

  const handleDeactivateSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handleActivateSearch = useCallback(() => {
    setIsSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const handleVotePressPay = useCallback(
    async (candidate: Candidate) => {
      if (isBusy) {
        Alert.alert('Chargement en cours', 'Veuillez patienter pendant la mise a jour du concours.');
        return;
      }
      if (hasVoted) {
        Alert.alert('Vote deja enregistre', 'Merci, votre vote est deja pris en compte.');
        return;
      }

      const activeContestId = contest?.id || contestId;
      if (!activeContestId || !contest || contest.status !== 'active') {
        Alert.alert('Concours indisponible', 'Les votes ne sont pas ouverts pour le moment.');
        return;
      }

      const rawPhone = typeof user?.phoneNumber === 'string' ? user.phoneNumber : undefined;
      const phone = rawPhone && rawPhone.trim().length > 0 ? rawPhone : undefined;

      setPaymentStatus(null);
      setPaymentMessage(null);
      setLastTransactionId(null);
      setSelectedCandidate(null);
      setModalVisible(false);

      setIsPreparingPayment(true);
      setPendingCandidate(candidate);

      try {
        const createIntent = httpsCallable(functionsInstance, 'createVoteIntent');
        const response = await createIntent({
          contestId: activeContestId,
          candidateId: candidate.id,
          amount: PAYMENT_CONFIG.VOTE_AMOUNT_XOF,
        });

        const payload = (response as { data?: unknown })?.data ?? null;
        let intentIdCandidate: string | null = null;
        if (payload && typeof payload === 'object') {
          const recordPayload = payload as Record<string, unknown>;
          const rawIntentId = recordPayload['intentId'] ?? recordPayload['intent_id'] ?? null;
          if (typeof rawIntentId === 'string') {
            const trimmed = rawIntentId.trim();
            if (trimmed.length > 0) {
              intentIdCandidate = trimmed;
            }
          } else if (typeof rawIntentId === 'number' && Number.isFinite(rawIntentId)) {
            intentIdCandidate = String(rawIntentId);
          }
        }

        if (!intentIdCandidate) {
          throw new Error('Intent de vote introuvable.');
        }

        openKkiapayWidget({
          amount: PAYMENT_CONFIG.VOTE_AMOUNT_XOF,
          reason: `Vote pour ${candidate.name}`,
          publicAPIKey: PAYMENT_CONFIG.KKIAPAY_PUBLIC_KEY,
          sandbox: PAYMENT_CONFIG.SANDBOX,
          theme: '#FF7A00',
          name: user?.name || undefined,
          fullname: user?.name || undefined,
          email: user?.email || undefined,
          phone,
          partnerId: intentIdCandidate,
          countries: PAYMENT_CONFIG.COUNTRIES ? [...PAYMENT_CONFIG.COUNTRIES] : undefined,
          paymentMethods: PAYMENT_CONFIG.PAYMENT_METHODS ? [...PAYMENT_CONFIG.PAYMENT_METHODS] : undefined,
        });
      } catch (error) {
        setPendingCandidate(null);
        const message = error instanceof Error ? error.message : 'Impossible de lancer le module de paiement.';
        Alert.alert('Paiement indisponible', message);
      } finally {
        setIsPreparingPayment(false);
      }
    },
    [contest, contestId, functionsInstance, hasVoted, isBusy, openKkiapayWidget, user]
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isSearchActive) {
          handleDeactivateSearch();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }, [handleDeactivateSearch, isSearchActive])
  );

  const renderListHeader = () => (
    <View>
      <View style={styles.contestHeader}>
        <MaterialCommunityIcons name="trophy-award" size={48} color="#f59e0b" />
        {isBusy ? (
          <ActivityIndicator size="small" color="#111" style={styles.headerLoader} />
        ) : contest ? (
          <>
            <Text style={styles.contestTitle}>{contest.title}</Text>
            {contest.description ? <Text style={styles.contestDescription}>{contest.description}</Text> : null}
            <ContestCountdown endDate={contest.endDate} />
            {hasVoted ? <Text style={styles.voteThanks}>Merci pour votre vote !</Text> : null}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(totalVotes)}</Text>
                <Text style={styles.statLabel}>Votes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalParticipants}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.contestTitle}>Concours indisponible</Text>
            <Text style={styles.contestDescription}>{errorMessage ?? 'Revenez plus tard pour voter.'}</Text>
          </>
        )}
      </View>
      <TouchableOpacity style={styles.searchBarContainer} onPress={handleActivateSearch} disabled={!contest || isBusy}>
        <Ionicons name="search-outline" size={20} color="#8A8A8E" style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>
          {contest ? 'Rechercher un candidat...' : isLoading ? 'Chargement...' : 'Aucun candidat disponible'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {!isSearchActive ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Concours de Vote</Text>
          <View style={{ width: 40 }} />
        </View>
      ) : (
        <View style={styles.searchHeader}>
          <View style={styles.searchBarContainerActive}>
            <Ionicons name="search-outline" size={20} color="#8A8A8E" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher un candidat..."
              placeholderTextColor="#8A8A8E"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <TouchableOpacity onPress={handleDeactivateSearch}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredCandidates}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CandidateCard item={item} totalVotes={totalVotes} onVote={handleVotePressPay} disabled={hasVoted} />
        )}
        ListHeaderComponent={!isSearchActive ? renderListHeader : null}
        ListEmptyComponent={
          !isBusy && contest ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Aucun candidat pour le moment</Text>
              <Text style={styles.emptyStateSubtitle}>Revenez plus tard pour decouvrir les participants.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <VoteConfirmationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setPaymentStatus(null);
          setPaymentMessage(null);
          setLastTransactionId(null);
        }}
        candidate={selectedCandidate}
        status={paymentStatus ?? 'success'}
        transactionId={lastTransactionId}
        message={paymentMessage ?? undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#111', fontSize: 20, fontWeight: 'bold' },
  cancelButtonText: { color: '#007bff', fontSize: 16, marginLeft: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  contestHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  contestTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginTop: 12, textAlign: 'center' },
  contestDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  voteThanks: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 20,
    marginBottom: 10,
    height: 48,
  },
  searchBarContainerActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },
  searchPlaceholder: {
    color: '#8A8A8E',
    fontSize: 15,
  },
  candidateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  candidatePhoto: { width: 64, height: 64, borderRadius: 32 },
  candidateInfo: { flex: 1, marginHorizontal: 12 },
  candidateName: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  candidateMedia: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f2f3f5',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#FF7A00', borderRadius: 3 },
  candidateVotes: { fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '600' },
  voteButton: {
    backgroundColor: '#FF7A00',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  voteButtonDisabled: { opacity: 0.5 },
  voteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerLoader: { marginTop: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  emptyStateSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },
});

export default ContestScreen;
