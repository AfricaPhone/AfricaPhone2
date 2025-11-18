import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// On iOS/Android, Firebase initializes automatically via the native google-services files.
const db = getFirestore();
const auth = getAuth();

export { db, auth };
