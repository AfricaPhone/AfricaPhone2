import {
  buildCustomerOrderFromDraft,
  buildInitialInstallmentPlanFromOrder,
  serializeCustomerOrderForClient,
  validateCreateOrderDraft,
} from './customerOrders';

const validDeliveryPayload = {
  id: 'AFP-20260615-TEST',
  createdAt: '2026-06-15T10:00:00.000Z',
  paymentMode: 'delivery',
  fulfillmentMode: 'delivery',
  profile: {
    fullName: 'Client Test',
    email: '',
    whatsapp: '+2290100000000',
    city: 'Abomey-Calavi',
    address: 'Maison test, voie pavee, proche repere',
    representativeName: '',
    representativePhone: '',
  },
  items: [
    {
      id: 'product-1',
      name: 'Telephone test',
      price: 100000,
      image: null,
      tagline: 'Produit test',
      qty: 1,
    },
  ],
  totalQty: 1,
  totalPrice: 100000,
  acceptedDeliveryFee: true,
  documents: {
    idDocumentName: '',
    idDocumentId: null,
    contractName: '',
    contractDocumentId: null,
    representativeIdName: '',
    representativeIdDocumentId: null,
  },
};

describe('customer order creation', () => {
  it('requires a valid email before direct Kkiapay payment', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      paymentMode: 'kkiapay',
      profile: {
        ...validDeliveryPayload.profile,
        email: 'client@example',
        city: 'Abomey-Calavi',
      },
    });

    expect(validation).toMatchObject({
      ok: false,
      message: 'Profil complet requis avant paiement ou cotisation.',
    });
  });

  it('requires representative phone when another person retrieves the order', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      fulfillmentMode: 'representative',
      profile: {
        ...validDeliveryPayload.profile,
        representativeName: 'Jean Test',
        representativePhone: '',
      },
    });

    expect(validation).toMatchObject({
      ok: false,
      message: 'Nom et telephone du representant requis.',
    });
  });

  it('keeps a direct Kkiapay order pending until provider verification succeeds', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      paymentMode: 'kkiapay',
      profile: {
        ...validDeliveryPayload.profile,
        email: 'client@example.com',
        city: 'Abomey-Calavi',
      },
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: 'order-kkiapay',
      now: null,
      userId: 'user-1',
    });

    expect(order).toMatchObject({
      status: 'pending_review',
      paymentMode: 'kkiapay_now',
      paymentStatus: 'pending',
      profileRequired: true,
    });
  });

  it('requires uploaded document ids before creating an installment order', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      paymentMode: 'cotisation',
      profile: {
        ...validDeliveryPayload.profile,
        email: 'client@example.com',
        city: 'Abomey-Calavi',
      },
      documents: {
        ...validDeliveryPayload.documents,
        idDocumentName: 'piece.pdf',
        contractName: 'contrat.pdf',
      },
    });

    expect(validation).toMatchObject({
      ok: false,
      message: 'Piece d identite et contrat signe transmis requis pour la cotisation.',
    });
  });

  it('builds an initial installment plan from a cotisation order', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      paymentMode: 'cotisation',
      profile: {
        ...validDeliveryPayload.profile,
        email: 'client@example.com',
        city: 'Abomey-Calavi',
      },
      documents: {
        ...validDeliveryPayload.documents,
        idDocumentName: 'piece.pdf',
        idDocumentId: 'document-id-1',
        contractName: 'contrat.pdf',
        contractDocumentId: 'contract-id-1',
      },
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: 'order-cotisation',
      installmentPlanId: 'plan-cotisation',
      now: null,
      userId: 'user-1',
    });
    const plan = buildInitialInstallmentPlanFromOrder({
      order,
      installmentPlanId: 'plan-cotisation',
      now: null,
    });

    expect(order.installmentPlanId).toBe('plan-cotisation');
    expect(plan).toMatchObject({
      id: 'plan-cotisation',
      orderId: 'order-cotisation',
      userId: 'user-1',
      status: 'contract_review',
      productTotal: 100000,
      amountPaid: 0,
      balanceRemaining: 100000,
      contractDocumentId: 'contract-id-1',
      identityDocumentId: 'document-id-1',
      selectedProduct: {
        name: 'Telephone test',
      },
    });
  });

  it('normalizes delivery location and stores a Maps link for the admin team', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      deliveryLocation: {
        latitude: 6.370292812,
        longitude: 2.391236212,
        accuracy: 12.4,
        capturedAt: '2026-06-15T10:01:00.000Z',
        mapUrl: 'https://example.com/unsafe-client-link',
        source: 'browser_geolocation',
      },
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    expect(validation.draft.deliveryLocation).toEqual({
      latitude: 6.3702928,
      longitude: 2.3912362,
      accuracy: 12,
      capturedAt: '2026-06-15T10:01:00.000Z',
      mapUrl: 'https://www.google.com/maps?q=6.3702928,2.3912362',
      source: 'browser_geolocation',
    });

    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: 'order-1',
      now: null,
      userId: null,
    });

    expect(order.delivery.location?.mapUrl).toBe('https://www.google.com/maps?q=6.3702928,2.3912362');
  });

  it('serializes an order for customer tracking without backend-only ownership fields', () => {
    const validation = validateCreateOrderDraft({
      ...validDeliveryPayload,
      deliveryLocation: {
        latitude: 6.370292812,
        longitude: 2.391236212,
        accuracy: 12.4,
        capturedAt: '2026-06-15T10:01:00.000Z',
        source: 'browser_geolocation',
      },
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const order = buildCustomerOrderFromDraft({
      draft: validation.draft,
      orderId: 'order-1',
      now: new Date('2026-06-15T10:02:00.000Z'),
      userId: 'user-1',
    });
    const clientOrder = serializeCustomerOrderForClient(order);

    expect(clientOrder).toMatchObject({
      id: 'order-1',
      localDraftId: 'AFP-20260615-TEST',
      createdAt: '2026-06-15T10:02:00.000Z',
      delivery: {
        location: {
          mapUrl: 'https://www.google.com/maps?q=6.3702928,2.3912362',
        },
      },
    });
    expect('userId' in clientOrder).toBe(false);
  });
});
