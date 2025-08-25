// jest-setup.js

// Mock de react-native-gesture-handler
import 'react-native-gesture-handler/jestSetup';

// Mock de react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Désactive l'avertissement concernant useNativeDriver pour Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
