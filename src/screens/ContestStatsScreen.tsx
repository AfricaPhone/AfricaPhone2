// src/screens/ContestStatsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_CONTEST, MOCK_STATS } from '../data/mockContestData';

const StatBar: React.FC<{ label: string; value: number; maxValue: number; color: string }> = ({
  label,
  value,
  maxValue,
  color,
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
};

const ContestStatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const contest = MOCK_CONTEST;
  const stats = MOCK_STATS;

  const maxValue = Math.max(...stats.flatMap(s => s.voteHistory));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques du Concours</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.contestTitle}>{contest.title}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution des votes (48h)</Text>
          <View style={styles.chartContainer}>
            {stats.map((candidate, index) => (
              <View key={candidate.id}>
                <Text style={styles.candidateName}>{candidate.name}</Text>
                <StatBar
                  label="Hier"
                  value={candidate.voteHistory[3]}
                  maxValue={maxValue}
                  color={['#ff9f40', '#4bc0c0', '#36a2eb'][index]}
                />
                <StatBar
                  label="Aujourd'hui"
                  value={candidate.voteHistory[4]}
                  maxValue={maxValue}
                  color={['#ff6384', '#ffcd56', '#9966ff'][index]}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  backButton: { padding: 4 },
  headerTitle: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  contestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartContainer: {
    gap: 20,
  },
  candidateName: {
    fontWeight: '600',
    marginBottom: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 80,
    fontSize: 12,
    color: '#6b7280',
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    width: 50,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ContestStatsScreen;
