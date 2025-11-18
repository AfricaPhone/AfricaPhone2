import { getApps, initializeApp, cert, applicationDefault, type AppOptions, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'africaphone-vente';
const DEFAULT_STORAGE_BUCKET =
  process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'africaphone-vente.firebasestorage.app';

const cleanPrivateKey = (key: string) => key.replace(/\\n/g, '\n');

const parseServiceAccount = (): ServiceAccount | null => {
  const inlineCredential = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (inlineCredential) {
    try {
      const decoded =
        inlineCredential.trim().startsWith('{') ?
          inlineCredential :
          Buffer.from(inlineCredential, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        throw new Error('Invalid FIREBASE_ADMIN_CREDENTIALS payload.');
      }
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (error) {
      console.error('firebaseAdmin: unable to parse FIREBASE_ADMIN_CREDENTIALS', error);
      throw error;
    }
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || DEFAULT_PROJECT_ID;

  if (clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
};

const createAppOptions = (): AppOptions => {
  const serviceAccount = parseServiceAccount();

  if (serviceAccount) {
    return {
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: cleanPrivateKey(serviceAccount.privateKey),
      }),
      storageBucket: DEFAULT_STORAGE_BUCKET,
    };
  }

  try {
    return {
      credential: applicationDefault(),
      storageBucket: DEFAULT_STORAGE_BUCKET,
    };
  } catch (error) {
    console.error('firebaseAdmin: unable to use application default credentials. Set FIREBASE_ADMIN_* env vars.', error);
    throw error;
  }
};

let cachedApp: App | null = null;

const getOrInitApp = () => {
  if (cachedApp) {
    return cachedApp;
  }

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  const options = createAppOptions();
  cachedApp = initializeApp(options);
  return cachedApp;
};

export const getAdminDb = () => getFirestore(getOrInitApp());
export const getAdminStorage = () => getStorage(getOrInitApp());
export const getAdminBucket = () => getAdminStorage().bucket(DEFAULT_STORAGE_BUCKET);
