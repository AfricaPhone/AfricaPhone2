// src/screens/MatchListScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Match } from '../types';

// Component for a single match item in the list
const MatchListItem: React.FC<{ item: Match }> = ({ item }) => {
  const navigation = useNavigation<any>();

  const statusInfo = useMemo(() => {
    const now = new Date();
    const startTime = item.startTime.toDate();
    const hasResult = typeof item.finalScoreA === 'number' && typeof item.finalScoreB === 'number';

    if (hasResult) {
      return { text: 'Terminé', color: '#6b7280', icon: 'checkmark-circle' as const };
    }
    if (now > startTime) {
      return { text: 'En cours', color: '#ef4444', icon: 'flame' as const };
    }
    return { text: 'À venir', color: '#22c55e', icon: 'time' as const };
  }, [item]);

  const handlePress = () => {
    navigation.navigate('PredictionGame', { matchId: item.id });
  };

  return (
    <TouchableOpacity style={styles.matchCard} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.matchInfo}>
        <Text style={styles.competitionText}>{item.competition}</Text>
        <View style={styles.teamRow}>
          <Text style={styles.teamName}>{item.teamA}</Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.teamName}>{item.teamB}</Text>
        </View>
        <Text style={styles.dateText}>
          {item.startTime.toDate().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Ionicons name={statusInfo.icon} size={12} color="#fff" />
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
};

// Main screen component
const MatchListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, orderBy('startTime', 'desc')); // Show most recent first

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const fetchedMatches: Match[] = [];
        querySnapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          fetchedMatches.push({ id: doc.id, ...doc.data() } as Match);
        });
        setMatches(fetchedMatches);
        setLoading(false);
      },
      error => {
        console.error('Erreur de lecture des matchs: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisir un Match</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#FF7A00" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id!}
          renderItem={({ item }) => <MatchListItem item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun match disponible</Text>
              <Text style={styles.emptySubText}>Revenez plus tard pour de nouveaux pronostics.</Text>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#111',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchInfo: {
    flex: 1,
  },
  competitionText: {
    color: '#FF7A00',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    color: '#111',
    fontSize: 18,
    fontWeight: 'bold',
  },
  vsText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 99,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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

export default MatchListScreen;
