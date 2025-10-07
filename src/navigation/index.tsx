// src/navigation/index.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import BrandScreen from '../screens/BrandScreen';
import PredictionGameScreen from '../screens/PredictionGameScreen';
import MatchListScreen from '../screens/MatchListScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AuthPromptScreen from '../screens/AuthPromptScreen';
import CreateProfileScreen from '../screens/CreateProfileScreen';
import StoreScreen from '../screens/StoreScreen';
import FilterScreenResults from '../screens/FilterScreenResults';
import ProductListScreen from '../screens/ProductListScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import FilterScreen from '../screens/FilterScreen';
import ContestScreen from '../screens/ContestScreen';
import CandidateProfileScreen from '../screens/CandidateProfileScreen';
import PredictionRulesScreen from '../screens/PredictionRulesScreen';
// SUPPRESSION: L'import de ContestStatsScreen n'est plus nécessaire
import { RootStackParamList, TabParamList, MainStackParamList } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminWinnersScreen from '../screens/AdminWinnersScreen';
import MatchWinnersScreen from '../screens/MatchWinnersScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Main = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 6,
        },
        tabBarIcon: ({ color, focused }) => {
          let name: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home':
              name = focused ? 'home' : 'home-outline';
              break;
            case 'Catalog':
              name = focused ? 'search' : 'search-outline';
              break;
            case 'Favorites':
              name = focused ? 'heart' : 'heart-outline';
              break;
            case 'Profile':
              name = focused ? 'person' : 'person-outline';
              break;
            default:
              name = 'ellipse-outline';
          }
          return <Ionicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ tabBarLabel: 'Recherche' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: 'Favoris' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

const MainStack = () => (
  <Main.Navigator
    screenOptions={{
      headerTitleAlign: 'left',
    }}
  >
    <Main.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
  </Main.Navigator>
);

const RootNavigator: React.FC = () => {
  return (
    <RootStack.Navigator>
      {/* Screens principaux */}
      <RootStack.Screen name="Main" component={MainStack} options={{ headerShown: false }} />
      <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Brand" component={BrandScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="MatchList" component={MatchListScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="PredictionGame" component={PredictionGameScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="PredictionRules" component={PredictionRulesScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="MatchWinners" component={MatchWinnersScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Store" component={StoreScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="FilterScreenResults" component={FilterScreenResults} options={{ headerShown: false }} />
      <RootStack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="CategorySelection" component={CategorySelectionScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="FilterScreen" component={FilterScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Contest" component={ContestScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="AdminWinners" component={AdminWinnersScreen} options={{ headerShown: false }} />
      {/* SUPPRESSION: La déclaration de l'écran de statistiques n'est plus nécessaire */}

      {/* Screens modaux */}
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="AuthPrompt" component={AuthPromptScreen} options={{ headerShown: false }} />
        <RootStack.Screen
          name="CreateProfile"
          component={CreateProfileScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <RootStack.Screen name="CandidateProfile" component={CandidateProfileScreen} options={{ headerShown: false }} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};

export default RootNavigator;
export type { RootStackParamList, TabParamList, MainStackParamList } from '../types';
