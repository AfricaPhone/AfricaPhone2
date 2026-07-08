import type { CartItem } from './cart';

export type CheckoutPaymentMode = 'delivery' | 'kkiapay' | 'pickup' | 'cotisation';
export type CheckoutFulfillmentMode = 'delivery' | 'shop' | 'representative';

export type CheckoutProfile = {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  address: string;
  representativeName: string;
  representativePhone: string;
};

export type CheckoutDeliveryLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string | null;
  mapUrl: string;
  source: 'browser_geolocation';
};

export type CheckoutDraft = {
  id: string;
  createdAt: string;
  paymentMode: CheckoutPaymentMode;
  fulfillmentMode: CheckoutFulfillmentMode;
  profile: CheckoutProfile;
  items: CartItem[];
  totalQty: number;
  totalPrice: number;
  acceptedDeliveryFee: boolean;
  deliveryLocation: CheckoutDeliveryLocation | null;
  documents: {
    idDocumentName: string;
    idDocumentId?: string | null;
    contractName: string;
    contractDocumentId?: string | null;
    representativeIdName: string;
    representativeIdDocumentId?: string | null;
  };
  orderSync: {
    status: 'not_attempted' | 'created' | 'failed';
    orderId: string | null;
    referenceCode?: string | null;
    createdAt: string | null;
    error: string | null;
    profileRequired: boolean;
  };
};

export const CHECKOUT_DRAFT_STORAGE_KEY = 'africaphone_checkout_draft';
export const CHECKOUT_HISTORY_STORAGE_KEY = 'africaphone_checkout_history';
const CHECKOUT_HISTORY_LIMIT = 30;

export const PAYMENT_MODE_LABELS: Record<CheckoutPaymentMode, string> = {
  delivery: 'Payer a la livraison',
  kkiapay: 'Payer en ligne maintenant',
  pickup: 'Confirmer en boutique',
  cotisation: 'Acheter par cotisation',
};

export const FULFILLMENT_MODE_LABELS: Record<CheckoutFulfillmentMode, string> = {
  delivery: 'Livraison',
  shop: 'Retrait client en boutique',
  representative: 'Retrait par representant',
};

export const NEXT_STEP_MESSAGES: Record<CheckoutPaymentMode, string> = {
  delivery: 'Confirmer la disponibilite, la zone et le montant de livraison.',
  kkiapay: 'Ouvrir le paiement securise Kkiapay puis verifier la transaction.',
  pickup: 'Confirmer le stock et organiser le passage en boutique.',
  cotisation: 'Verifier les documents, valider le contrat et definir l echeancier.',
};

export const formatCheckoutReference = (reference?: string | null) => {
  const normalized = reference?.trim();
  if (!normalized) {
    return 'Demande';
  }

  const controlledReferenceMatch = /^AP-(\d{6})-([A-Z2-9]{4}-[A-Z2-9]{4})-([A-Z2-9]{2})$/i.exec(normalized);
  if (controlledReferenceMatch) {
    const [, datePart, randomPart, checkPart] = controlledReferenceMatch;
    return `Demande ${datePart.slice(4, 6)}/${datePart.slice(2, 4)} #${randomPart.toUpperCase()}-${checkPart.toUpperCase()}`;
  }

  const randomReferenceMatch = /^AFP-([A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4})$/i.exec(normalized);
  if (randomReferenceMatch) {
    return `Demande #${randomReferenceMatch[1].toUpperCase()}`;
  }

  const draftMatch = /^AFP-(\d{8})-([A-Z0-9]+)$/i.exec(normalized);
  if (draftMatch) {
    const [, , suffix] = draftMatch;
    return `Demande #${suffix.toUpperCase()}`;
  }

  return `Demande #${normalized.replace(/^AFP-/i, '').slice(-14).toUpperCase()}`;
};

const isBrowser = () => typeof window !== 'undefined';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const buildReferenceDatePart = (date: Date) => date.toISOString().slice(2, 10).replace(/-/g, '');

const createRandomReferencePart = (length: number) => {
  const bytes = new Uint8Array(length);
  if (isBrowser() && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, byte => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join('');
};

const buildProvisionalCheckPart = (datePart: string, randomPart: string) => {
  const total = Array.from(`${datePart}${randomPart}`).reduce((sum, char, index) => {
    const code = char.charCodeAt(0);
    return sum + code * (index + 3);
  }, 0);
  return `${REFERENCE_ALPHABET[total % REFERENCE_ALPHABET.length]}${REFERENCE_ALPHABET[(total * 7) % REFERENCE_ALPHABET.length]}`;
};

const createDraftId = () => {
  const datePart = buildReferenceDatePart(new Date());
  const randomPart = `${createRandomReferencePart(4)}-${createRandomReferencePart(4)}`;
  return `AP-${datePart}-${randomPart}-${buildProvisionalCheckPart(datePart, randomPart)}`;
};

const isFiniteCoordinate = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const normalizeDeliveryLocation = (value: unknown): CheckoutDeliveryLocation | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const location = value as Partial<CheckoutDeliveryLocation>;
  if (!isFiniteCoordinate(location.latitude, -90, 90) || !isFiniteCoordinate(location.longitude, -180, 180)) {
    return null;
  }

  const latitude = Number(location.latitude.toFixed(7));
  const longitude = Number(location.longitude.toFixed(7));
  const accuracy =
    typeof location.accuracy === 'number' && Number.isFinite(location.accuracy) && location.accuracy >= 0
      ? Math.round(location.accuracy)
      : null;

  return {
    latitude,
    longitude,
    accuracy,
    capturedAt: typeof location.capturedAt === 'string' && location.capturedAt ? location.capturedAt : null,
    mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    source: 'browser_geolocation',
  };
};

type CheckoutDraftInput = Omit<CheckoutDraft, 'id' | 'createdAt' | 'orderSync' | 'deliveryLocation'> &
  Partial<Pick<CheckoutDraft, 'orderSync' | 'deliveryLocation'>>;

export const saveCheckoutDraft = (draft: CheckoutDraftInput) => {
  const nextDraft: CheckoutDraft = {
    ...draft,
    id: createDraftId(),
    createdAt: new Date().toISOString(),
    deliveryLocation: normalizeDeliveryLocation(draft.deliveryLocation),
    orderSync: draft.orderSync ?? {
      status: 'not_attempted',
      orderId: null,
      referenceCode: null,
      createdAt: null,
      error: null,
      profileRequired: false,
    },
  };

  if (isBrowser()) {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  }

  return nextDraft;
};

export const persistCheckoutDraft = (draft: CheckoutDraft) => {
  if (isBrowser()) {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }

  return draft;
};

export const updateCheckoutDraftOrderSync = (draft: CheckoutDraft, orderSync: CheckoutDraft['orderSync']) =>
  persistCheckoutDraft({ ...draft, orderSync });

export const clearCheckoutDrafts = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(CHECKOUT_HISTORY_STORAGE_KEY);
};

const normalizeCheckoutDraft = (draft: CheckoutDraft): CheckoutDraft => {
  if (!draft.orderSync) {
    return {
      ...draft,
      deliveryLocation: normalizeDeliveryLocation(draft.deliveryLocation),
      orderSync: {
        status: 'not_attempted',
        orderId: null,
        referenceCode: null,
        createdAt: null,
        error: null,
        profileRequired: false,
      },
    };
  }

  return {
    ...draft,
    deliveryLocation: normalizeDeliveryLocation(draft.deliveryLocation),
    orderSync: {
      status: draft.orderSync.status,
      orderId: draft.orderSync.orderId ?? null,
      referenceCode: draft.orderSync.referenceCode ?? null,
      createdAt: draft.orderSync.createdAt ?? null,
      error: draft.orderSync.error ?? null,
      profileRequired: draft.orderSync.profileRequired === true,
    },
  };
};

const isStoredCheckoutDraft = (value: unknown): value is CheckoutDraft => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CheckoutDraft).id === 'string' &&
    typeof (value as CheckoutDraft).createdAt === 'string' &&
    Array.isArray((value as CheckoutDraft).items)
  );
};

export const getCheckoutHistory = (): CheckoutDraft[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isStoredCheckoutDraft)
      .map(normalizeCheckoutDraft)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, CHECKOUT_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

export const upsertCheckoutHistory = (draft: CheckoutDraft) => {
  if (!isBrowser()) {
    return normalizeCheckoutDraft(draft);
  }

  const normalizedDraft = normalizeCheckoutDraft(draft);
  const nextHistory = [
    normalizedDraft,
    ...getCheckoutHistory().filter(historyDraft => historyDraft.id !== normalizedDraft.id),
  ].slice(0, CHECKOUT_HISTORY_LIMIT);

  window.localStorage.setItem(CHECKOUT_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return normalizedDraft;
};

export const getCheckoutDraft = (): CheckoutDraft | null => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
      return null;
    }

    return normalizeCheckoutDraft(parsed as CheckoutDraft);
  } catch {
    return null;
  }
};
