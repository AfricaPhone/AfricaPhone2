import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

type Analytics = import('firebase/analytics').Analytics;

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const resolveConfig = (): FirebaseConfig => {
  const envConfig: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };

  const missing = Object.entries(envConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'test') {
      return {
        apiKey: envConfig.apiKey || 'test-api-key',
        authDomain: envConfig.authDomain || 'test-auth-domain',
        projectId: envConfig.projectId || 'test-project',
        storageBucket: envConfig.storageBucket || 'test-bucket',
        messagingSenderId: envConfig.messagingSenderId || '0',
        appId: envConfig.appId || 'test-app',
      };
    }
    throw new Error(
      `Firebase configuration missing environment variables: ${missing.join(
        ', '
      )}. Ensure NEXT_PUBLIC_FIREBASE_* values are set.`
    );
  }

  return envConfig;
};

const firebaseConfig = resolveConfig();

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);

let analyticsPromise: Promise<Analytics | null> | null = null;

export const getAnalyticsClient = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      try {
        const { isSupported, getAnalytics } = await import('firebase/analytics');
        const supported = await isSupported();
        return supported ? getAnalytics(app) : null;
      } catch (error) {
        console.error('Firebase analytics not available', error);
        return null;
      }
    })();
  }

  return analyticsPromise;
};
