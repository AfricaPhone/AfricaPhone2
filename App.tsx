// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { StoreProvider } from './src/store/StoreContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProductProvider } from './src/store/ProductContext'; // Import ProductProvider

export default function App() {
  const theme: Theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#ffffff' },
  };

  return (
    <SafeAreaProvider>
      <ProductProvider>
        <StoreProvider>
          <NavigationContainer theme={theme}>
            <RootNavigator />
          </NavigationContainer>
        </StoreProvider>
      </ProductProvider>
    </SafeAreaProvider>
  );
}
