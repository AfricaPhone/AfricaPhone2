// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native'; // Importer View
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { StoreProvider } from './src/store/StoreContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProductProvider } from './src/store/ProductContext';
import { FavoritesProvider } from './src/store/FavoritesContext';
import { BoutiqueProvider } from './src/store/BoutiqueContext';
import { FilterProvider } from './src/store/FilterContext'; // Importez le nouveau provider
import UpdateModal from './src/components/UpdateModal';

export default function App() {
  const theme: Theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#ffffff' },
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BoutiqueProvider>
          <ProductProvider>
            {/* Le FilterProvider vient ici, après ProductProvider */}
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
    </View>
  );
}