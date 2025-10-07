// jest-setup.js
/* eslint-env jest */

// Mock de react-native-gesture-handler
import 'react-native-gesture-handler/jestSetup';

// Mock de react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Desactive l'avertissement concernant useNativeDriver pour Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
