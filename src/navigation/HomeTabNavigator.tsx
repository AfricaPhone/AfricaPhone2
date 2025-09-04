// src/navigation/HomeTabNavigator.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CategoryScreen from '../screens/home/CategoryScreen';

const Tab = createMaterialTopTabNavigator();

const SEGMENTS = ['Populaires', 'tablette', 'portable a touche', 'accessoire'] as const;
export type Segment = (typeof SEGMENTS)[number];

const SEGMENTS_DATA: Array<{
  key: Segment;
  label: string;
}> = [
  { key: 'Populaires', label: 'Populaires' },
  { key: 'tablette', label: 'Tablettes' },
  { key: 'portable a touche', label: 'Portables' },
  { key: 'accessoire', label: 'Accessoires' },
];

const HomeTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
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
          name={label}
          component={CategoryScreen}
          initialParams={{ category: key }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
