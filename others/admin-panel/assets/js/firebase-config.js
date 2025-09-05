// Importe les fonctions nécessaires du SDK Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js';

// Vos informations de configuration Firebase.
const firebaseConfig = {
  apiKey: 'AIzaSyDNYwc40OWGXHrOOqqPYTB_jDGJmI7Mc1M',
  authDomain: 'africaphone-vente.firebaseapp.com',
  projectId: 'africaphone-vente',
  storageBucket: 'africaphone-vente.firebasestorage.app',
  messagingSenderId: '203471818329',
  appId: '1:203471818329:web:c2c77d48098c1a6a596b48',
};

const appFB = initializeApp(firebaseConfig);

export const auth = getAuth(appFB);
export const db = getFirestore(appFB);
export const storage = getStorage(appFB);
