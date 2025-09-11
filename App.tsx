// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
// import { View } from 'react-native'; // CORRECTION: Import de View retiré car non utilisé
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { StoreProvider } from './src/store/StoreContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProductProvider } from './src/store/ProductContext';
import { FavoritesProvider } from './src/store/FavoritesContext';
import { BoutiqueProvider } from './src/store/BoutiqueContext';
import UpdateModal from './src/components/UpdateModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FilterProvider } from './src/store/FilterContext';

export default function App() {
  const theme: Theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#ffffff' },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BoutiqueProvider>
          <ProductProvider>
            <FilterProvider>
              <FavoritesProvider>
                <StoreProvider>
                  <NavigationContainer theme={theme}>
                    <RootNavigator />
                  </NavigationContainer>
                </StoreProvider>
              </FavoritesProvider>
            </FilterProvider>
          </ProductProvider>
        </BoutiqueProvider>
      </SafeAreaProvider>
      <UpdateModal />
    </GestureHandlerRootView>
  );
}