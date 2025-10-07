// src/screens/AdminWinnersScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/config';
import { collection, doc, onSnapshot, query, where, setDoc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Prediction } from '../types';
import { useStore } from '../store/StoreContext';

const AdminWinnersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Prediction[]>([]);
  const isAdmin = user?.isAdmin === true;

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const ref = collection(db, 'predictions');
    const q = query(ref, where('isWinner', '==', true));
    const unsub = onSnapshot(
      q,
      snap => {
        const list: Prediction[] = [];
        snap.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          list.push({ id: d.id, ...d.data() } as Prediction);
        });
        // Sort by createdAt desc if available
        list.sort((a, b) => {
          const ad = (a.createdAt as any)?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
          const bd = (b.createdAt as any)?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
          return bd - ad;
        });
        setWinners(list);
        setLoading(false);
      },
      err => {
        console.error('Erreur chargement gagnants:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  const toggleFeatured = useCallback(async (item: Prediction) => {
    try {
      if (!item.id) return;
      const ref = doc(db, 'predictions', item.id);
      const next = !item.featuredWinner;
      await setDoc(ref, { featuredWinner: next }, { merge: true });
    } catch (e: any) {
      console.error('Erreur mise à jour featuredWinner:', e);
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour.');
    }
  }, []);

  const renderItem = ({ item }: { item: Prediction }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.avatar, item.featuredWinner ? styles.avatarFeatured : null]}>
          <Ionicons name="trophy" size={16} color={item.featuredWinner ? '#fff' : '#f59e0b'} />
        </View>
        <View>
          <Text style={styles.name} numberOfLines={1}>{item.userName}</Text>
          <Text style={styles.sub}>
            {item.scoreA} - {item.scoreB} • {item.matchId}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.tag, item.featuredWinner ? styles.tagOn : styles.tagOff]}
        onPress={() => toggleFeatured(item)}
      >
        <Text style={[styles.tagText, item.featuredWinner ? styles.tagTextOn : styles.tagTextOff]}>
          {item.featuredWinner ? 'Mis en avant' : 'Mettre en avant'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestion des gagnants</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}> 
          <Ionicons name="lock-closed" size={24} color="#9ca3af" />
          <Text style={styles.denied}>Accès réservé aux administrateurs</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des gagnants</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#FF7A00" />
      ) : (
        <FlatList
          data={winners}
          keyExtractor={item => item.id!}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Aucun gagnant pour le moment.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  headerTitle: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  avatarFeatured: { backgroundColor: '#f59e0b', borderColor: '#d97706' },
  name: { fontSize: 15, fontWeight: '600', color: '#111', maxWidth: '80%' },
  sub: { fontSize: 12, color: '#6b7280' },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagOn: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  tagOff: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  tagText: { fontWeight: '600', fontSize: 12 },
  tagTextOn: { color: '#92400e' },
  tagTextOff: { color: '#374151' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  denied: { color: '#6b7280' },
});

export default AdminWinnersScreen;

