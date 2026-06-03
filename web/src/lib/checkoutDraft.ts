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
  documents: {
    idDocumentName: string;
    contractName: string;
    representativeIdName: string;
  };
};

export const CHECKOUT_DRAFT_STORAGE_KEY = 'africaphone_checkout_draft';

export const PAYMENT_MODE_LABELS: Record<CheckoutPaymentMode, string> = {
  delivery: 'Payer a la livraison',
  kkiapay: 'Payer maintenant avec Kkiapay',
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
  kkiapay: 'Creer la commande puis lancer le paiement Kkiapay securise.',
  pickup: 'Confirmer le stock et organiser le passage en boutique.',
  cotisation: 'Verifier les documents, valider le contrat et definir l echeancier.',
};

const isBrowser = () => typeof window !== 'undefined';

const createDraftId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AFP-${datePart}-${randomPart}`;
};

export const saveCheckoutDraft = (draft: Omit<CheckoutDraft, 'id' | 'createdAt'>) => {
  const nextDraft: CheckoutDraft = {
    ...draft,
    id: createDraftId(),
    createdAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  }

  return nextDraft;
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

    return parsed as CheckoutDraft;
  } catch {
    return null;
  }
};
