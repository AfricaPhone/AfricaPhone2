// src/screens/home/ProductSegments.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SEGMENTS = ['Populaires', 'Tablettes', 'Acessoires', 'Portables a Touches'] as const;
export type Segment = (typeof SEGMENTS)[number];

const SEGMENTS_DATA: Array<{
  key: Segment;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'Populaires', label: 'Top et Populaires', icon: 'star-outline' },
  { key: 'Tablettes', label: 'Tablettes', icon: 'tablet-portrait-outline' },
  // MODIFICATION: Le label est changé ici pour notre test
  { key: 'Acessoires', label: 'Audio & Plus', icon: 'headset-outline' },
  { key: 'Portables a Touches', label: 'Classiques', icon: 'keypad-outline' },
];

interface Props {
  activeSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
}

const ProductSegments: React.FC<Props> = ({ activeSegment, onSegmentChange }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScrollContainer}>
      {SEGMENTS_DATA.map(s => {
        const active = s.key === activeSegment;
        const iconName = active ? (s.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : s.icon;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onSegmentChange(s.key)}
            style={[styles.segmentPill, active && styles.segmentPillActive]}
          >
            <Ionicons name={iconName} size={18} color={active ? '#FF7A00' : '#111'} />
            <Text style={[styles.segmentPillText, active && styles.segmentPillTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  segmentScrollContainer: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  segmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F3F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  segmentPillActive: {
    backgroundColor: '#fff1e6',
  },
  segmentPillText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111',
  },
  segmentPillTextActive: {
    color: '#FF7A00',
  },
});

export default ProductSegments;