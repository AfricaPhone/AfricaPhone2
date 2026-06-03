import type { CheckoutDraft } from '@/lib/checkoutDraft';
import type {
  CustomerFulfillmentMode,
  CustomerOrder,
  CustomerOrderItemSnapshot,
  CustomerOrderStatus,
  CustomerPaymentMode,
  CustomerPaymentStatus,
  FirestoreTimestampLike,
} from '@/types/customerOrders';

type CreateOrderValidationResult =
  | { ok: true; draft: CheckoutDraft }
  | { ok: false; message: string; status: number };

const CHECKOUT_PAYMENT_TO_ORDER_PAYMENT: Record<CheckoutDraft['paymentMode'], CustomerPaymentMode> = {
  delivery: 'pay_on_delivery',
  kkiapay: 'kkiapay_now',
  pickup: 'shop_confirmation',
  cotisation: 'installment_plan',
};

const CHECKOUT_FULFILLMENT_TO_ORDER_FULFILLMENT: Record<CheckoutDraft['fulfillmentMode'], CustomerFulfillmentMode> = {
  delivery: 'delivery',
  shop: 'shop_pickup',
  representative: 'representative_pickup',
};

const PAYMENT_MODES = new Set<CheckoutDraft['paymentMode']>(['delivery', 'kkiapay', 'pickup', 'cotisation']);
const FULFILLMENT_MODES = new Set<CheckoutDraft['fulfillmentMode']>(['delivery', 'shop', 'representative']);

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toNullableString = (value: unknown) => {
  const cleaned = toCleanString(value);
  return cleaned.length > 0 ? cleaned : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeItems = (items: unknown): CustomerOrderItemSnapshot[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item): CustomerOrderItemSnapshot | null => {
      if (!isRecord(item)) {
        return null;
      }

      const productId = toCleanString(item.id);
      const name = toCleanString(item.name);
      const quantity = Math.max(1, Math.floor(Number(item.qty || 0)));
      const unitPrice = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null;

      if (!productId || !name || !quantity) {
        return null;
      }

      return {
        productId,
        productPath: `products/${productId}`,
        name,
        imageUrl: toNullableString(item.image),
        tagline: toNullableString(item.tagline),
        quantity,
        unitPrice,
        subtotal: unitPrice === null ? null : unitPrice * quantity,
      };
    })
    .filter((item): item is CustomerOrderItemSnapshot => item !== null);
};

export const validateCreateOrderDraft = (payload: unknown): CreateOrderValidationResult => {
  if (!isRecord(payload)) {
    return { ok: false, message: 'Requete invalide.', status: 400 };
  }

  const paymentMode = payload.paymentMode;
  const fulfillmentMode = payload.fulfillmentMode;

  if (!PAYMENT_MODES.has(paymentMode as CheckoutDraft['paymentMode'])) {
    return { ok: false, message: 'Mode de paiement invalide.', status: 400 };
  }

  if (!FULFILLMENT_MODES.has(fulfillmentMode as CheckoutDraft['fulfillmentMode'])) {
    return { ok: false, message: 'Mode de reception invalide.', status: 400 };
  }

  const profile = isRecord(payload.profile) ? payload.profile : {};
  const fullName = toCleanString(profile.fullName);
  const whatsapp = toCleanString(profile.whatsapp);
  const email = toCleanString(profile.email);
  const city = toCleanString(profile.city);
  const address = toCleanString(profile.address);
  const representativeName = toCleanString(profile.representativeName);
  const representativePhone = toCleanString(profile.representativePhone);

  if (fullName.length < 3) {
    return { ok: false, message: 'Nom complet requis.', status: 400 };
  }

  if (whatsapp.length < 8) {
    return { ok: false, message: 'Numero WhatsApp requis.', status: 400 };
  }

  const needsFullProfile = paymentMode === 'kkiapay' || paymentMode === 'cotisation';
  if (needsFullProfile && (!email.includes('@') || city.length < 2 || address.length < 6)) {
    return { ok: false, message: 'Profil complet requis avant paiement ou cotisation.', status: 400 };
  }

  if (fulfillmentMode === 'delivery' && address.length < 6) {
    return { ok: false, message: 'Adresse de livraison requise.', status: 400 };
  }

  if (fulfillmentMode === 'delivery' && payload.acceptedDeliveryFee !== true) {
    return { ok: false, message: 'Acceptation des frais de livraison requise.', status: 400 };
  }

  if (fulfillmentMode === 'representative' && representativeName.length < 3) {
    return { ok: false, message: 'Nom du representant requis.', status: 400 };
  }

  const documents = isRecord(payload.documents) ? payload.documents : {};
  const idDocumentName = toCleanString(documents.idDocumentName);
  const contractName = toCleanString(documents.contractName);
  const representativeIdName = toCleanString(documents.representativeIdName);

  if (paymentMode === 'cotisation' && (!idDocumentName || !contractName)) {
    return { ok: false, message: 'Piece d identite et contrat signe requis pour la cotisation.', status: 400 };
  }

  const normalizedItems = normalizeItems(payload.items);
  if (normalizedItems.length === 0) {
    return { ok: false, message: 'Le panier est vide.', status: 400 };
  }

  const localDraftId = toCleanString(payload.id);
  const totalQty = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = normalizedItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

  return {
    ok: true,
    draft: {
      id: localDraftId || 'local-draft',
      createdAt: toCleanString(payload.createdAt) || new Date().toISOString(),
      paymentMode: paymentMode as CheckoutDraft['paymentMode'],
      fulfillmentMode: fulfillmentMode as CheckoutDraft['fulfillmentMode'],
      profile: {
        fullName,
        email,
        whatsapp,
        city,
        address,
        representativeName,
        representativePhone,
      },
      items: normalizedItems.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.unitPrice,
        image: item.imageUrl,
        tagline: item.tagline ?? '',
        qty: item.quantity,
      })),
      totalQty,
      totalPrice,
      acceptedDeliveryFee: payload.acceptedDeliveryFee === true,
      documents: {
        idDocumentName,
        contractName,
        representativeIdName,
      },
      orderSync: {
        status: 'not_attempted',
        orderId: null,
        createdAt: null,
        error: null,
      },
    },
  };
};

export const buildCustomerOrderFromDraft = (params: {
  draft: CheckoutDraft;
  orderId: string;
  now: FirestoreTimestampLike;
  userId?: string | null;
}): CustomerOrder => {
  const { draft, orderId, now, userId = null } = params;
  const items = normalizeItems(draft.items);
  const paymentMode = CHECKOUT_PAYMENT_TO_ORDER_PAYMENT[draft.paymentMode];
  const fulfillmentMode = CHECKOUT_FULFILLMENT_TO_ORDER_FULFILLMENT[draft.fulfillmentMode];
  const profileRequired =
    draft.paymentMode === 'kkiapay' ||
    draft.paymentMode === 'cotisation' ||
    draft.fulfillmentMode === 'representative';
  const status: CustomerOrderStatus = profileRequired && !userId ? 'profile_required' : 'pending_review';
  const paymentStatus: CustomerPaymentStatus =
    draft.paymentMode === 'kkiapay' || draft.paymentMode === 'cotisation' ? 'pending' : 'not_required';
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

  return {
    id: orderId,
    userId,
    guestId: userId ? null : draft.id,
    status,
    paymentMode,
    paymentStatus,
    fulfillmentMode,
    profileRequired,
    customer: {
      fullName: draft.profile.fullName,
      email: toNullableString(draft.profile.email),
      whatsapp: draft.profile.whatsapp,
      city: toNullableString(draft.profile.city),
      address: toNullableString(draft.profile.address),
      photoUrl: null,
    },
    representative:
      draft.fulfillmentMode === 'representative'
        ? {
            fullName: draft.profile.representativeName,
            whatsapp: toNullableString(draft.profile.representativePhone),
            identityDocumentId: null,
            confirmationMode: draft.documents.representativeIdName ? 'pending' : 'phone_call',
          }
        : null,
    delivery: {
      acceptedDeliveryFee: draft.acceptedDeliveryFee,
      city: toNullableString(draft.profile.city),
      address: toNullableString(draft.profile.address),
      feeStatus: draft.fulfillmentMode === 'delivery' ? 'accepted_pending_amount' : 'not_applicable',
    },
    items,
    totals: {
      itemsSubtotal,
      deliveryFee: null,
      discountTotal: 0,
      totalDue: itemsSubtotal,
      currency: 'XOF',
    },
    source: 'web',
    localDraftId: draft.id,
    createdAt: now,
    updatedAt: now,
  };
};
