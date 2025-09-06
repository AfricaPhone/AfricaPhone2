// src/services/notificationService.ts
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, arrayUnion } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';

// Configuration du comportement des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission d'envoyer des notifications et récupère le token.
 * @returns Le token Expo Push ou null si la permission est refusée.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // CORRECTION: Initialiser le token à null pour garantir le bon type de retour.
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission de notification refusée.');
      return null;
    }

    // Récupère le projectId depuis la configuration d'Expo
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('projectId non trouvé dans la configuration Expo.');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);
  } else {
    console.log('Doit être utilisé sur un appareil physique pour les Push Notifications.');
  }

  return token;
}

/**
 * Sauvegarde le token de notification pour un utilisateur donné dans Firestore.
 * @param userId L'ID de l'utilisateur.
 * @param token Le token à sauvegarder.
 */
export async function saveTokenToFirestore(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    // arrayUnion ajoute le token seulement s'il n'est pas déjà présent dans le tableau.
    await updateDoc(userDocRef, {
      pushTokens: arrayUnion(token),
    });
    console.log(`Token sauvegardé pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token :', error);
  }
}
