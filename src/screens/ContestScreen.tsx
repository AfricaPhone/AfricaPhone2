// src/screens/ContestScreen.tsx
import React, { useMemo, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native'; // AJOUT
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_CONTEST, MOCK_CANDIDATES } from '../data/mockContestData';
import { Candidate, RootStackParamList } from '../types';
import ContestCountdown from '../components/ContestCountdown';
import VoteConfirmationModal from '../components/VoteConfirmationModal';

const formatNumber = (num: number) => new Intl.NumberFormat('fr-FR').format(num);

const CandidateCard: React.FC<{ item: Candidate; totalVotes: number; onVote: (c: Candidate) => void }> = ({
  item,
  totalVotes,
  onVote,
}) => {
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
      <TouchableOpacity style={styles.voteButton} onPress={() => onVote(item)}>
        <Text style={styles.voteButtonText}>Voter</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const ContestScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const contest = MOCK_CONTEST;
  const candidates = useMemo(() => {
    if (!searchQuery) {
      return MOCK_CANDIDATES;
    }
    return MOCK_CANDIDATES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const handleDeactivateSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  // AJOUT: Gestion du bouton retour physique/geste
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isSearchActive) {
          handleDeactivateSearch();
          return true; // Empêche le retour en arrière par défaut
        }
        return false; // Autorise le retour en arrière par défaut
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isSearchActive, handleDeactivateSearch])
  );

  const handleVotePress = (candidate: Candidate) => {
    Keyboard.dismiss();
    Alert.alert(
      `Voter pour ${candidate.name}`,
      'Chaque vote coûte 100 FCFA. Le système de paiement sera intégré prochainement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer mon vote',
          onPress: () => {
            setSelectedCandidate(candidate);
            setModalVisible(true);
          },
        },
      ]
    );
  };

  const handleActivateSearch = () => {
    setIsSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const ListHeader = useCallback(
    () => (
      <View>
        <View style={styles.contestHeader}>
          <MaterialCommunityIcons name="trophy-award" size={48} color="#f59e0b" />
          <Text style={styles.contestTitle}>{contest.title}</Text>
          <Text style={styles.contestDescription}>{contest.description}</Text>
          <ContestCountdown endDate={contest.endDate} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(contest.totalVotes)}</Text>
              <Text style={styles.statLabel}>Votes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{contest.totalParticipants}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.searchBarContainer} onPress={handleActivateSearch}>
          <Ionicons name="search-outline" size={20} color="#8A8A8E" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Rechercher un candidat...</Text>
        </TouchableOpacity>
      </View>
    ),
    [contest]
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
        data={candidates}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CandidateCard item={item} totalVotes={contest.totalVotes} onVote={handleVotePress} />
        )}
        ListHeaderComponent={!isSearchActive ? ListHeader : null}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        keyboardShouldPersistTaps="handled"
      />

      <VoteConfirmationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        candidate={selectedCandidate}
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
  voteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

export default ContestScreen;
