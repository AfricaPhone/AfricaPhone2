import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { formatPrice } from '../utils/formatPrice';

const { width: windowWidth } = Dimensions.get('window');
// Calculate slider width based on typical screen width and padding in parent components
const SLIDER_WIDTH = windowWidth - 32 - 40; // Screen width - (parent padding + component padding)
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const PADDING_HORIZONTAL = 20; // Internal padding for the slider container

interface PriceRangeSliderProps {
  min: number; // Overall minimum possible price
  max: number; // Overall maximum possible price
  initialMinValue?: number;
  initialMaxValue?: number;
  onChange: (minValue: number, maxValue: number) => void;
}

const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  initialMinValue = min,
  initialMaxValue = max,
  onChange,
}) => {
  // State to display current formatted values
  const [currentMin, setCurrentMin] = useState(initialMinValue);
  const [currentMax, setCurrentMax] = useState(initialMaxValue);

  // Convert initial values (price) to initial pixel positions (X coordinates)
  const initialMinX = (initialMinValue - min) / (max - min) * SLIDER_WIDTH;
  const initialMaxX = (initialMaxValue - min) / (max - min) * SLIDER_WIDTH;

  // Shared values for animated positions of the thumbs
  const minThumbX = useSharedValue(initialMinX);
  const maxThumbX = useSharedValue(initialMaxX);

  // Helper function to clamp value within bounds (for Worklets)
  const clampedTranslate = (value: number, lowerBound: number, upperBound: number) => {
    'worklet';
    return Math.max(lowerBound, Math.min(value, upperBound));
  };

  // Maps a pixel position (X coordinate) back to a price value
  const mapXToPrice = useCallback((x: number) => {
    'worklet';
    const normalizedX = x / SLIDER_WIDTH;
    return Math.round(min + normalizedX * (max - min));
  }, [min, max, SLIDER_WIDTH]);

  // Gesture handler for the minimum price thumb
  const minGestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = minThumbX.value; // Store initial X position
    },
    onActive: (event, ctx: any) => {
      // Calculate new X position, clamped between 0 and maxThumbX's current position
      let newX = ctx.startX + event.translationX;
      newX = clampedTranslate(newX, 0, maxThumbX.value - THUMB_SIZE); // Ensure min thumb doesn't cross max thumb and leaves space
      minThumbX.value = newX;
      
      // Convert animated X values to price values and update React state via runOnJS
      const newMinValue = mapXToPrice(minThumbX.value);
      const newMaxValue = mapXToPrice(maxThumbX.value);
      runOnJS(setCurrentMin)(newMinValue);
      runOnJS(onChange)(newMinValue, newMaxValue); // Notify parent component of changes
    },
    onEnd: () => {
      // Optional: Add a spring animation to snap to steps if needed, for now, just ends smoothly
    },
  });

  // Gesture handler for the maximum price thumb
  const maxGestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = maxThumbX.value; // Store initial X position
    },
    onActive: (event, ctx: any) => {
      // Calculate new X position, clamped between minThumbX's current position and SLIDER_WIDTH
      let newX = ctx.startX + event.translationX;
      newX = clampedTranslate(newX, minThumbX.value + THUMB_SIZE, SLIDER_WIDTH); // Ensure max thumb doesn't cross min thumb and leaves space
      maxThumbX.value = newX;

      // Convert animated X values to price values and update React state via runOnJS
      const newMinValue = mapXToPrice(minThumbX.value);
      const newMaxValue = mapXToPrice(maxThumbX.value);
      runOnJS(setCurrentMax)(newMaxValue);
      runOnJS(onChange)(newMinValue, newMaxValue); // Notify parent component of changes
    },
    onEnd: () => {
      // Optional: Add a spring animation to snap to steps if needed
    },
  });

  // Animated style for the minimum price thumb
  const minThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: minThumbX.value }],
    };
  });

  // Animated style for the maximum price thumb
  const maxThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: maxThumbX.value }],
    };
  });

  // Animated style for the filled portion of the track between the thumbs
  const trackFillStyle = useAnimatedStyle(() => {
    const startX = minThumbX.value;
    const endX = maxThumbX.value;
    const width = endX - startX + THUMB_SIZE; // Width includes both thumbs
    return {
      left: startX,
      width: width,
    };
  });

  return (
    // GestureHandlerRootView is required for PanGestureHandler to work
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={styles.container}>
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>{formatPrice(currentMin)}</Text>
          <Text style={styles.label}>{formatPrice(currentMax)}</Text>
        </View>
        <View style={styles.trackContainer}>
          {/* Base track */}
          <View style={styles.track} />
          {/* Filled portion of the track */}
          <Animated.View style={[styles.trackFill, trackFillStyle]} />

          {/* Min price thumb */}
          <PanGestureHandler onGestureEvent={minGestureHandler}>
            <Animated.View style={[styles.thumb, styles.minThumb, minThumbStyle]} />
          </PanGestureHandler>

          {/* Max price thumb */}
          <PanGestureHandler onGestureEvent={maxGestureHandler}>
            <Animated.View style={[styles.thumb, styles.maxThumb, maxThumbStyle]} />
          </PanGestureHandler>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    // flex: 1, // Only if this component is the root of the gesture handling view
  },
  container: {
    width: '100%',
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
  },
  trackContainer: {
    height: THUMB_SIZE, // Make space for the thumb vertically
    justifyContent: 'center',
    position: 'relative',
    width: SLIDER_WIDTH + THUMB_SIZE, // Adjusted for thumbs to move fully to ends
    alignSelf: 'center',
  },
  track: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    width: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#e5e7eb', // Grey track
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#111', // Black for filled part
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderColor: '#111',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  minThumb: {
    left: 0, // Initial position, will be overridden by transform
  },
  maxThumb: {
    right: 0, // Initial position, will be overridden by transform
  },
});

export default PriceRangeSlider;
