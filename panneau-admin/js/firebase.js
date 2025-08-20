// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNYwc40OWGXHrOOqqPYTB_jDGJmI7Mc1M",
  authDomain: "africaphone-vente.firebaseapp.com",
  projectId: "africaphone-vente",
  storageBucket: "africaphone-vente.firebasestorage.app",
  messagingSenderId: "203471818329",
  appId: "1:203471818329:web:c2c77d48098c1a6a596b48"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
