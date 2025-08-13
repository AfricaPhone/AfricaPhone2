// src/navigation/index.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CartScreen from '../screens/CartScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import BrandScreen from '../screens/BrandScreen';
import PredictionGameScreen from '../screens/PredictionGameScreen';
import MatchListScreen from '../screens/MatchListScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AuthPromptScreen from '../screens/AuthPromptScreen';
import CreateProfileScreen from '../screens/CreateProfileScreen';
import StoreScreen from '../screens/StoreScreen'; // Importer le nouvel écran
import { RootStackParamList, TabParamList, MainStackParamList } from '../types';
import { useCart } from '../store/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Main = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const CartButton = () => {
  const navigation = useNavigation<any>();
  const { cartCount } = useCart();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartButton}>
      <Ionicons name="cart-outline" size={24} color="#111" />
      {cartCount > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

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
            case 'Discover':
              name = focused ? 'compass' : 'compass-outline';
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
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarLabel: 'Découvrir' }} />
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ tabBarLabel: 'Recherche' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: 'Favoris' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

const MainStack = () => (
  <Main.Navigator
    screenOptions={{
      headerRight: () => <CartButton />,
      headerTitleAlign: 'left',
    }}
  >
    <Main.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
  </Main.Navigator>
);

const RootNavigator: React.FC = () => {
  return (
    <RootStack.Navigator>
      <RootStack.Screen name="Main" component={MainStack} options={{ headerShown: false }} />
      <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Brand" component={BrandScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="MatchList" component={MatchListScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="PredictionGame" component={PredictionGameScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Store" component={StoreScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <RootStack.Screen name="AuthPrompt" component={AuthPromptScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <RootStack.Screen name="CreateProfile" component={CreateProfileScreen} options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
      <RootStack.Screen name="Cart" component={CartScreen} options={{ presentation: 'modal', headerShown: false }} />
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  cartButton: {
    marginRight: 16,
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#FF7A00',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RootNavigator;
