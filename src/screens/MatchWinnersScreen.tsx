// src/screens/MatchWinnersScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { db } from '../firebase/config';
import { Prediction, RootStackParamList } from '../types';

type MatchWinnersRouteProp = RouteProp<RootStackParamList, 'MatchWinners'>;

const buildDisplayName = (prediction: Prediction) => {
  const first = prediction.contactFirstName?.trim() ?? '';
  const last = prediction.contactLastName?.trim() ?? '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined.length > 0) {
    return combined;
  }
  return prediction.userName?.trim() ?? 'Participant';
};

const MatchWinnersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<MatchWinnersRouteProp>();
  const { matchId, teamA, teamB, finalScoreA, finalScoreB } = route.params;

  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Prediction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const ref = collection(db, 'predictions');
    const q = query(ref, where('matchId', '==', matchId), where('isWinner', '==', true));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const list: Prediction[] = [];
        snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Prediction);
        });

        list.sort((a, b) => {
          const aDate = (a.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
          const bDate = (b.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
          return bDate - aDate;
        });

        setWinners(list);
        setLoading(false);
      },
      error => {
        console.error('Erreur chargement gagnants:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  const filteredWinners = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    if (queryText.length === 0) {
      return winners;
    }
    return winners.filter(prediction => {
      const name = buildDisplayName(prediction).toLowerCase();
      const fallback = prediction.userName?.toLowerCase() ?? '';
      return name.includes(queryText) || fallback.includes(queryText);
    });
  }, [searchTerm, winners]);

  const renderItem = useCallback(
    ({ item, index }: { item: Prediction; index: number }) => (
      <View style={styles.row}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.winnerName} numberOfLines={1}>
            {buildDisplayName(item)}
          </Text>
          <Text style={styles.winnerScore}>
            Score : {item.scoreA} - {item.scoreB}
          </Text>
        </View>
      </View>
    ),
    []
  );

  const finalScoreLabel =
    typeof finalScoreA === 'number' && typeof finalScoreB === 'number'
      ? `${finalScoreA} - ${finalScoreB}`
      : 'Score final non défini';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>Gagnants</Text>
          <Text style={styles.headerSubtitle}>
            {teamA} vs {teamB} • {finalScoreLabel}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Rechercher un gagnant"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#FF7A00" />
      ) : (
        <FlatList
          data={filteredWinners}
          keyExtractor={(item, index) => item.id ?? `${item.matchId}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={filteredWinners.length === 0 ? styles.emptyContent : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={36} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Aucun gagnant trouvé</Text>
              <Text style={styles.emptySubtitle}>
                {winners.length === 0
                  ? 'Il n’y a pas encore de gagnants pour ce match.'
                  : 'Aucun gagnant ne correspond à votre recherche.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTextWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 14,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 14,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  winnerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  winnerScore: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default MatchWinnersScreen;

