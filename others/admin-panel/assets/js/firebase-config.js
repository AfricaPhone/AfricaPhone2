// Importe les fonctions nécessaires du SDK Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js';
import { getAnalytics, logEvent as firebaseLogEvent } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js';

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
const analytics = getAnalytics(appFB);

export const auth = getAuth(appFB);
export const db = getFirestore(appFB);
export const storage = getStorage(appFB);
export const functions = getFunctions(appFB);
export { analytics };
export const logEvent = (...args) => firebaseLogEvent(analytics, ...args);
export { httpsCallable };
