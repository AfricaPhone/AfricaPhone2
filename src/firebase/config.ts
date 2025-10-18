import { Platform } from 'react-native';

type FirebaseExports = {
  db: unknown;
  auth: unknown;
};

export function getFirebaseExports(platform: string): FirebaseExports {
  return platform === 'web'
    ? (require('./config.web') as FirebaseExports)
    : (require('./config.native') as FirebaseExports);
}

declare global {
  // eslint-disable-next-line no-var
  var __firebasePlatformOverride: string | undefined;
}

const resolvePlatform = () => globalThis.__firebasePlatformOverride ?? Platform.OS;

export function setFirebasePlatformOverride(platform?: string) {
  globalThis.__firebasePlatformOverride = platform;
}

const { db, auth } = getFirebaseExports(resolvePlatform());

export { db, auth };
