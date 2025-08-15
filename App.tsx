// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { StoreProvider } from './src/store/StoreContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProductProvider } from './src/store/ProductContext';
import { CartProvider } from './src/store/CartContext';
import { FavoritesProvider } from './src/store/FavoritesContext';
import { BoutiqueProvider } from './src/store/BoutiqueContext'; // Importer BoutiqueProvider

export default function App() {
  const theme: Theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#ffffff' },
  };

  return (
    <SafeAreaProvider>
      <BoutiqueProvider>
        <ProductProvider>
          <CartProvider>
            <FavoritesProvider>
              <StoreProvider>
                <NavigationContainer theme={theme}>
                  <RootNavigator />
                </NavigationContainer>
              </StoreProvider>
            </FavoritesProvider>
          </CartProvider>
        </ProductProvider>
      </BoutiqueProvider>
    </SafeAreaProvider>
  );
}