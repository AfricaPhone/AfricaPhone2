import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Avec un client de développement natif, Firebase est initialisé
// automatiquement via google-services.json au démarrage de l'application.
// Nous pouvons donc récupérer directement les instances de service.
const db = getFirestore();
const auth = getAuth();

export { db, auth };
