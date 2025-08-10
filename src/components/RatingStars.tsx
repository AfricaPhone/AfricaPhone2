import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  rating: number; // 0..5
  size?: number;
  color?: string;
  spacing?: number;
};

const RatingStars: React.FC<Props> = ({ rating, size = 14, color = '#f59e0b', spacing = 2 }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <View style={[styles.row, { columnGap: spacing }]}>
      {Array.from({ length: full }).map((_, i) => (
        <Ionicons key={`f-${i}`} name="star" size={size} color={color} />
      ))}
      {half === 1 && <Ionicons name="star-half" size={size} color={color} />}
      {Array.from({ length: empty }).map((_, i) => (
        <Ionicons key={`e-${i}`} name="star-outline" size={size} color={color} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

export default RatingStars;
