import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CheckoutProfile } from './checkoutDraft';
import { db } from './firebaseClient';

export type CustomerProfileDraft = {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  address: string;
  photoName: string;
  idDocumentName: string;
  contractName: string;
  photoDocumentId: string | null;
  photoStoragePath: string | null;
  idDocumentId: string | null;
  idDocumentStoragePath: string | null;
  contractDocumentId: string | null;
  contractDocumentStoragePath: string | null;
  userId: string | null;
  emailVerified: boolean;
  firestoreSyncedAt: string | null;
  updatedAt: string | null;
};

export type CustomerProfileReadiness = {
  completion: number;
  lightReady: boolean;
  fullReady: boolean;
  cotisationReady: boolean;
  missingLight: string[];
  missingFull: string[];
  missingCotisation: string[];
};

export const CUSTOMER_PROFILE_STORAGE_KEY = 'africaphone_customer_profile';

export const INITIAL_CUSTOMER_PROFILE: CustomerProfileDraft = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  address: '',
  photoName: '',
  idDocumentName: '',
  contractName: '',
  photoDocumentId: null,
  photoStoragePath: null,
  idDocumentId: null,
  idDocumentStoragePath: null,
  contractDocumentId: null,
  contractDocumentStoragePath: null,
  userId: null,
  emailVerified: false,
  firestoreSyncedAt: null,
  updatedAt: null,
};

const isBrowser = () => typeof window !== 'undefined';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const readBoolean = (value: unknown) => value === true;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeCustomerProfile = (profile: Partial<CustomerProfileDraft> | null | undefined): CustomerProfileDraft => ({
  fullName: readString(profile?.fullName),
  email: readString(profile?.email),
  whatsapp: readString(profile?.whatsapp),
  city: readString(profile?.city),
  address: readString(profile?.address),
  photoName: readString(profile?.photoName),
  idDocumentName: readString(profile?.idDocumentName),
  contractName: readString(profile?.contractName),
  photoDocumentId: readString(profile?.photoDocumentId) || null,
  photoStoragePath: readString(profile?.photoStoragePath) || null,
  idDocumentId: readString(profile?.idDocumentId) || null,
  idDocumentStoragePath: readString(profile?.idDocumentStoragePath) || null,
  contractDocumentId: readString(profile?.contractDocumentId) || null,
  contractDocumentStoragePath: readString(profile?.contractDocumentStoragePath) || null,
  userId: readString(profile?.userId) || null,
  emailVerified: readBoolean(profile?.emailVerified),
  firestoreSyncedAt: readString(profile?.firestoreSyncedAt) || null,
  updatedAt: readString(profile?.updatedAt) || null,
});

export const getCustomerProfileDraft = (): CustomerProfileDraft | null => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CustomerProfileDraft>;
    return normalizeCustomerProfile(parsed);
  } catch {
    return null;
  }
};

export const saveCustomerProfileDraft = (profile: Partial<CustomerProfileDraft>) => {
  const nextProfile = normalizeCustomerProfile({
    ...profile,
    updatedAt: new Date().toISOString(),
  });

  if (isBrowser()) {
    window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
  }

  return nextProfile;
};

export const loadCustomerProfileFromFirestore = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  const customerProfile = isRecord(data.customerProfile) ? data.customerProfile : data;

  return normalizeCustomerProfile({
    fullName: customerProfile.fullName,
    email: user.email || customerProfile.email,
    whatsapp: customerProfile.whatsapp,
    city: customerProfile.city,
    address: customerProfile.address,
    photoName: customerProfile.photoName,
    idDocumentName: customerProfile.idDocumentName,
    contractName: customerProfile.contractName,
    photoDocumentId: customerProfile.photoDocumentId,
    photoStoragePath: customerProfile.photoStoragePath,
    idDocumentId: customerProfile.idDocumentId,
    idDocumentStoragePath: customerProfile.idDocumentStoragePath,
    contractDocumentId: customerProfile.contractDocumentId,
    contractDocumentStoragePath: customerProfile.contractDocumentStoragePath,
    userId: user.uid,
    emailVerified: user.emailVerified,
    firestoreSyncedAt: new Date().toISOString(),
  });
};

export const syncCustomerProfileToFirestore = async (profile: CustomerProfileDraft, user: User) => {
  const normalizedProfile = normalizeCustomerProfile({
    ...profile,
    userId: user.uid,
    email: user.email || profile.email,
    emailVerified: user.emailVerified,
    firestoreSyncedAt: new Date().toISOString(),
  });
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email || normalizedProfile.email,
      emailVerified: user.emailVerified,
      displayName: normalizedProfile.fullName,
      role: 'customer',
      source: 'web',
      customerProfile: {
        fullName: normalizedProfile.fullName,
        email: user.email || normalizedProfile.email,
        whatsapp: normalizedProfile.whatsapp,
        city: normalizedProfile.city,
        address: normalizedProfile.address,
        photoName: normalizedProfile.photoName,
        idDocumentName: normalizedProfile.idDocumentName,
        contractName: normalizedProfile.contractName,
        photoDocumentId: normalizedProfile.photoDocumentId,
        photoStoragePath: normalizedProfile.photoStoragePath,
        idDocumentId: normalizedProfile.idDocumentId,
        idDocumentStoragePath: normalizedProfile.idDocumentStoragePath,
        contractDocumentId: normalizedProfile.contractDocumentId,
        contractDocumentStoragePath: normalizedProfile.contractDocumentStoragePath,
        updatedAt: serverTimestamp(),
      },
      customerDocuments: {
        profilePhotoDocumentId: normalizedProfile.photoDocumentId,
        identityDocumentId: normalizedProfile.idDocumentId,
        signedContractDocumentId: normalizedProfile.contractDocumentId,
      },
      updatedAt: serverTimestamp(),
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return saveCustomerProfileDraft(normalizedProfile);
};

export const getCustomerProfileReadiness = (profile: CustomerProfileDraft): CustomerProfileReadiness => {
  const checks = {
    fullName: profile.fullName.length >= 3,
    whatsapp: profile.whatsapp.length >= 8,
    email: profile.email.includes('@') && profile.email.includes('.'),
    city: profile.city.length >= 2,
    address: profile.address.length >= 6,
    idDocumentName: profile.idDocumentName.length > 0 || Boolean(profile.idDocumentId),
    contractName: profile.contractName.length > 0 || Boolean(profile.contractDocumentId),
  };

  const missingLight = [
    !checks.fullName ? 'Nom complet' : null,
    !checks.whatsapp ? 'WhatsApp fonctionnel' : null,
  ].filter((item): item is string => item !== null);

  const missingFull = [
    ...missingLight,
    !checks.email ? 'Email fonctionnel' : null,
    !checks.city ? 'Ville ou quartier' : null,
    !checks.address ? 'Adresse complete' : null,
  ].filter((item): item is string => item !== null);

  const missingCotisation = [
    ...missingFull,
    !checks.idDocumentName ? 'Piece d identite' : null,
    !checks.contractName ? 'Contrat signe' : null,
  ].filter((item): item is string => item !== null);

  const completionChecks = [
    checks.fullName,
    checks.email,
    checks.whatsapp,
    checks.city,
    checks.address,
    profile.photoName.length > 0,
    checks.idDocumentName,
    checks.contractName,
  ];

  return {
    completion: Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100),
    lightReady: missingLight.length === 0,
    fullReady: missingFull.length === 0,
    cotisationReady: missingCotisation.length === 0,
    missingLight,
    missingFull,
    missingCotisation,
  };
};

export const mergeCustomerProfileIntoCheckout = (
  checkoutProfile: CheckoutProfile,
  customerProfile: CustomerProfileDraft
): CheckoutProfile => ({
  ...checkoutProfile,
  fullName: checkoutProfile.fullName || customerProfile.fullName,
  email: checkoutProfile.email || customerProfile.email,
  whatsapp: checkoutProfile.whatsapp || customerProfile.whatsapp,
  city: checkoutProfile.city || customerProfile.city,
  address: checkoutProfile.address || customerProfile.address,
});

export const buildCustomerProfileFromCheckout = (params: {
  checkoutProfile: CheckoutProfile;
  previousProfile?: CustomerProfileDraft | null;
  idDocumentName?: string;
  contractName?: string;
  idDocumentId?: string | null;
  idDocumentStoragePath?: string | null;
  contractDocumentId?: string | null;
  contractDocumentStoragePath?: string | null;
}) =>
  normalizeCustomerProfile({
    ...(params.previousProfile ?? INITIAL_CUSTOMER_PROFILE),
    fullName: params.checkoutProfile.fullName,
    email: params.checkoutProfile.email,
    whatsapp: params.checkoutProfile.whatsapp,
    city: params.checkoutProfile.city,
    address: params.checkoutProfile.address,
    idDocumentName: params.idDocumentName || params.previousProfile?.idDocumentName || '',
    contractName: params.contractName || params.previousProfile?.contractName || '',
    idDocumentId: params.idDocumentId || params.previousProfile?.idDocumentId || null,
    idDocumentStoragePath: params.idDocumentStoragePath || params.previousProfile?.idDocumentStoragePath || null,
    contractDocumentId: params.contractDocumentId || params.previousProfile?.contractDocumentId || null,
    contractDocumentStoragePath:
      params.contractDocumentStoragePath || params.previousProfile?.contractDocumentStoragePath || null,
  });
