// src/navigation/HomeTabNavigator.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import PatchedMaterialTopTabBar from './PatchedMaterialTopTabBar';
import CategoryScreen from '../screens/home/CategoryScreen';
import type { Segment } from '../types';

export type { Segment } from '../types';

const Tab = createMaterialTopTabNavigator();

const SEGMENTS_DATA: Array<{
  key: Segment;
  label: string;
}> = [
  { key: 'Populaires', label: 'Populaires' },
  { key: 'tablette', label: 'Tablettes' },
  { key: 'portable a touche', label: 'A touches' }, // MODIFICATION: "Portables" remplace par "A touches"
  { key: 'accessoire', label: 'Accessoires' },
];

const HomeTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <PatchedMaterialTopTabBar {...props} />}
      screenOptions={{
        swipeEnabled: false,
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: 'auto', paddingHorizontal: 12 },
        tabBarIndicatorStyle: {
          backgroundColor: '#FF7A00',
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: 'bold',
          textTransform: 'none',
        },
        tabBarActiveTintColor: '#FF7A00',
        tabBarInactiveTintColor: '#6b7280',
        lazy: true,
      }}
    >
      {SEGMENTS_DATA.map(({ key, label }) => (
        <Tab.Screen
          key={key}
          name={key}
          component={CategoryScreen}
          options={{ tabBarLabel: label }}
          initialParams={{ category: key }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
