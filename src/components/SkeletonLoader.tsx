import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const SkeletonPiece: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: object }> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shimmer, { transform: [{ translateX }] }]} />
    </View>
  );
};

export const GridSkeleton: React.FC = () => (
  <View style={styles.gridItem}>
    <SkeletonPiece width="100%" height={120} />
    <SkeletonPiece width="80%" height={16} style={{ marginTop: 8 }} />
    <SkeletonPiece width="50%" height={14} style={{ marginTop: 4 }} />
  </View>
);

export const ListSkeleton: React.FC = () => (
  <View style={styles.listItem}>
    <SkeletonPiece width={100} height={100} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <SkeletonPiece width="90%" height={18} />
      <SkeletonPiece width="40%" height={14} style={{ marginTop: 8 }} />
      <SkeletonPiece width="70%" height={14} style={{ marginTop: 4 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e1e9ee',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#f2f8fc',
    opacity: 0.6,
  },
  gridItem: {
    width: '48%',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});
