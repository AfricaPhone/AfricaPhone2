// Importe les fonctions nécessaires du SDK Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import {
  getFunctions,
  connectFunctionsEmulator as connectFunctionsEmulatorV9,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { getAnalytics, logEvent as firebaseLogEvent } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// Vos informations de configuration Firebase.
const firebaseConfig = {
  apiKey: 'AIzaSyDNYwc40OWGXHrOOqqPYTB_jDGJmI7Mc1M',
  authDomain: 'africaphone-vente.firebaseapp.com',
  projectId: 'africaphone-vente',
  storageBucket: 'africaphone-vente.firebasestorage.app',
  messagingSenderId: '203471818329',
  appId: '1:203471818329:web:c2c77d48098c1a6a596b48',
  measurementId: 'G-EYL8YL86KB',
};

const appFB = initializeApp(firebaseConfig);

// Initialisation des services critiques AVANT Analytics
// pour éviter qu'une erreur Analytics ne bloque Firestore
export const auth = getAuth(appFB);
export const db = getFirestore(appFB);
export const storage = getStorage(appFB);
export const functions = getFunctions(appFB);
export const connectFunctionsEmulator = connectFunctionsEmulatorV9;
export { multiFactor, TotpMultiFactorGenerator, TotpSecret, getMultiFactorResolver };
export { httpsCallable };

// Analytics est optionnel - on le protège avec try-catch
let analytics = null;
try {
  analytics = getAnalytics(appFB);
} catch (err) {
  console.warn('[Firebase] Analytics initialization failed (non-blocking):', err.message);
}

export { analytics };
export const logEvent = (...args) => {
  if (analytics) {
    try {
      firebaseLogEvent(analytics, ...args);
    } catch (err) {
      console.warn('[Firebase] Analytics logEvent failed:', err.message);
    }
  }
};
