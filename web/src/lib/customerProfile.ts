import type { CheckoutProfile } from './checkoutDraft';

export type CustomerProfileDraft = {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  address: string;
  photoName: string;
  idDocumentName: string;
  contractName: string;
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
  updatedAt: null,
};

const isBrowser = () => typeof window !== 'undefined';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeCustomerProfile = (profile: Partial<CustomerProfileDraft> | null | undefined): CustomerProfileDraft => ({
  fullName: readString(profile?.fullName),
  email: readString(profile?.email),
  whatsapp: readString(profile?.whatsapp),
  city: readString(profile?.city),
  address: readString(profile?.address),
  photoName: readString(profile?.photoName),
  idDocumentName: readString(profile?.idDocumentName),
  contractName: readString(profile?.contractName),
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

export const getCustomerProfileReadiness = (profile: CustomerProfileDraft): CustomerProfileReadiness => {
  const checks = {
    fullName: profile.fullName.length >= 3,
    whatsapp: profile.whatsapp.length >= 8,
    email: profile.email.includes('@') && profile.email.includes('.'),
    city: profile.city.length >= 2,
    address: profile.address.length >= 6,
    idDocumentName: profile.idDocumentName.length > 0,
    contractName: profile.contractName.length > 0,
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
  });
