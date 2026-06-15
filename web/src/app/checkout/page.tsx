'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { clearCart, type CartItem, subscribeToCart } from '@/lib/cart';
import {
  type CheckoutDeliveryLocation,
  type CheckoutFulfillmentMode,
  type CheckoutPaymentMode,
  type CheckoutProfile,
  saveCheckoutDraft,
  updateCheckoutDraftOrderSync,
  upsertCheckoutHistory,
} from '@/lib/checkoutDraft';
import {
  getCustomerDocumentAccept,
  uploadCustomerDocument,
  type CustomerDocumentUploadResult,
} from '@/lib/customerDocuments';
import {
  buildCustomerProfileFromCheckout,
  type CustomerProfileDraft,
  getCustomerProfileReadiness,
  getCustomerProfileDraft,
  INITIAL_CUSTOMER_PROFILE,
  mergeCustomerProfileIntoCheckout,
  saveCustomerProfileDraft,
  syncCustomerProfileToFirestore,
} from '@/lib/customerProfile';
import { auth } from '@/lib/firebaseClient';
import type { CustomerDocumentType } from '@/types/customerOrders';
import { formatPrice } from '@/utils/formatPrice';

type CheckoutDocumentField = 'idDocument' | 'contract' | 'representativeId';
type UploadStatus = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'failed';
type UploadState = {
  status: UploadStatus;
  message: string;
};

type CheckoutDocumentRefs = {
  idDocumentId: string;
  contractDocumentId: string;
  representativeIdDocumentId: string;
};

const CHECKOUT_DOCUMENT_CONFIG: Record<
  CheckoutDocumentField,
  {
    documentType: CustomerDocumentType;
    selectedMessage: string;
  }
> = {
  idDocument: {
    documentType: 'identity_card',
    selectedMessage: 'Piece selectionnee, upload avant commande.',
  },
  contract: {
    documentType: 'signed_contract',
    selectedMessage: 'Contrat selectionne, upload avant commande.',
  },
  representativeId: {
    documentType: 'representative_identity_card',
    selectedMessage: 'Piece selectionnee, upload avant commande.',
  },
};

const INITIAL_CHECKOUT_DOCUMENT_FILES: Record<CheckoutDocumentField, File | null> = {
  idDocument: null,
  contract: null,
  representativeId: null,
};

const INITIAL_CHECKOUT_UPLOAD_STATES: Record<CheckoutDocumentField, UploadState> = {
  idDocument: { status: 'idle', message: '' },
  contract: { status: 'idle', message: '' },
  representativeId: { status: 'idle', message: '' },
};

const INITIAL_CHECKOUT_DOCUMENT_REFS: CheckoutDocumentRefs = {
  idDocumentId: '',
  contractDocumentId: '',
  representativeIdDocumentId: '',
};

const buildDeliveryLocation = (position: GeolocationPosition): CheckoutDeliveryLocation => {
  const latitude = Number(position.coords.latitude.toFixed(7));
  const longitude = Number(position.coords.longitude.toFixed(7));

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
    mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    source: 'browser_geolocation',
  };
};

const applyCheckoutUploadResult = (
  refs: CheckoutDocumentRefs,
  field: CheckoutDocumentField,
  result: CustomerDocumentUploadResult
): CheckoutDocumentRefs => {
  if (field === 'idDocument') {
    return { ...refs, idDocumentId: result.id };
  }

  if (field === 'contract') {
    return { ...refs, contractDocumentId: result.id };
  }

  return { ...refs, representativeIdDocumentId: result.id };
};

const PAYMENT_MODES: Array<{
  id: CheckoutPaymentMode;
  title: string;
  tag: string;
  description: string;
}> = [
  {
    id: 'delivery',
    title: 'Payer a la livraison',
    tag: 'Profil leger',
    description: 'Le client paie quand l article arrive. Identite minimale et WhatsApp suffisent.',
  },
  {
    id: 'kkiapay',
    title: 'Payer maintenant',
    tag: 'Profil obligatoire',
    description: 'Kkiapay sera lance seulement apres profil complet pour identifier le payeur.',
  },
  {
    id: 'pickup',
    title: 'Confirmer en boutique',
    tag: 'Sans paiement en ligne',
    description: 'AfricaPhone confirme le stock, puis le client paie ou retire en boutique.',
  },
  {
    id: 'cotisation',
    title: 'Acheter par cotisation',
    tag: 'Contrat',
    description: 'Piece d identite, contrat signe et echeancier avant paiements Kkiapay.',
  },
];

const FULFILLMENT_MODES: Array<{
  id: CheckoutFulfillmentMode;
  title: string;
  description: string;
}> = [
  {
    id: 'delivery',
    title: 'Livraison',
    description: 'Frais ajoutes selon la zone et acceptes par le client.',
  },
  {
    id: 'shop',
    title: 'Retrait client',
    description: 'Le client passe lui-meme apres confirmation de disponibilite.',
  },
  {
    id: 'representative',
    title: 'Representant',
    description: 'Nom du representant et controle de son identite.',
  },
];

const initialProfile: CheckoutProfile = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  address: '',
  representativeName: '',
  representativePhone: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<CheckoutPaymentMode>('delivery');
  const [fulfillmentMode, setFulfillmentMode] = useState<CheckoutFulfillmentMode>('delivery');
  const [profile, setProfile] = useState<CheckoutProfile>(initialProfile);
  const [acceptDeliveryFee, setAcceptDeliveryFee] = useState(false);
  const [idDocumentName, setIdDocumentName] = useState('');
  const [contractName, setContractName] = useState('');
  const [representativeIdName, setRepresentativeIdName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<CheckoutDeliveryLocation | null>(null);
  const [deliveryLocationMessage, setDeliveryLocationMessage] = useState('');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [storedCustomerProfile, setStoredCustomerProfile] = useState<CustomerProfileDraft | null>(null);
  const [profileLoadedFromAccount, setProfileLoadedFromAccount] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [documentFiles, setDocumentFiles] = useState<Record<CheckoutDocumentField, File | null>>(
    INITIAL_CHECKOUT_DOCUMENT_FILES
  );
  const [documentUploadStates, setDocumentUploadStates] =
    useState<Record<CheckoutDocumentField, UploadState>>(INITIAL_CHECKOUT_UPLOAD_STATES);
  const [documentRefs, setDocumentRefs] = useState<CheckoutDocumentRefs>(INITIAL_CHECKOUT_DOCUMENT_REFS);

  useEffect(() => subscribeToCart(setItems), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const savedProfile = getCustomerProfileDraft();
    if (!savedProfile) {
      return;
    }

    setStoredCustomerProfile(savedProfile);
    setProfile(prev => mergeCustomerProfileIntoCheckout(prev, savedProfile));
    setIdDocumentName(prev => prev || savedProfile.idDocumentName);
    setContractName(prev => prev || savedProfile.contractName);
    setDocumentRefs(prev => ({
      ...prev,
      idDocumentId: prev.idDocumentId || savedProfile.idDocumentId || '',
      contractDocumentId: prev.contractDocumentId || savedProfile.contractDocumentId || '',
    }));
    setProfileLoadedFromAccount(true);
  }, []);

  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price * item.qty : 0), 0),
    [items]
  );

  const needsFullProfile = paymentMode === 'kkiapay' || paymentMode === 'cotisation';
  const needsCotisationDocuments = paymentMode === 'cotisation';
  const needsRepresentative = fulfillmentMode === 'representative';
  const needsDeliveryFee = fulfillmentMode === 'delivery';
  const needsAuthenticatedProfile = paymentMode === 'kkiapay' || paymentMode === 'cotisation';
  const hasIdentityDocument = Boolean(idDocumentName || documentRefs.idDocumentId || documentFiles.idDocument);
  const hasSignedContract = Boolean(contractName || documentRefs.contractDocumentId || documentFiles.contract);

  const requirements = useMemo(() => {
    const base = [
      { label: 'Nom complet du client', done: profile.fullName.trim().length >= 3 },
      { label: 'Numero WhatsApp fonctionnel', done: profile.whatsapp.trim().length >= 8 },
    ];

    const fullProfile = needsFullProfile
      ? [
          { label: 'Compte client connecte', done: Boolean(authUser) },
          { label: 'Email complet et fonctionnel', done: profile.email.includes('@') },
          { label: 'Ville ou quartier', done: profile.city.trim().length >= 2 },
          { label: 'Adresse complete', done: profile.address.trim().length >= 6 },
        ]
      : [];

    const delivery = needsDeliveryFee
      ? [
          ...(!needsFullProfile ? [{ label: 'Adresse de livraison', done: profile.address.trim().length >= 6 }] : []),
          { label: 'Acceptation des frais de livraison', done: acceptDeliveryFee },
        ]
      : [];

    const representative = needsRepresentative
      ? [{ label: 'Nom du representant', done: profile.representativeName.trim().length >= 3 }]
      : [];

    const cotisation = needsCotisationDocuments
      ? [
          { label: 'Piece d identite valide', done: hasIdentityDocument },
          { label: 'Contrat signe importe', done: hasSignedContract },
        ]
      : [];

    return [...base, ...fullProfile, ...delivery, ...representative, ...cotisation];
  }, [
    acceptDeliveryFee,
    authUser,
    contractName,
    documentFiles.contract,
    documentFiles.idDocument,
    documentRefs.contractDocumentId,
    documentRefs.idDocumentId,
    hasIdentityDocument,
    hasSignedContract,
    idDocumentName,
    needsCotisationDocuments,
    needsDeliveryFee,
    needsFullProfile,
    needsRepresentative,
    profile,
  ]);

  const missingRequirements = requirements.filter(requirement => !requirement.done);
  const canPrepareOrder = items.length > 0 && missingRequirements.length === 0;
  const checkoutCustomerProfile = useMemo(
    () =>
      buildCustomerProfileFromCheckout({
        checkoutProfile: profile,
        previousProfile: storedCustomerProfile ?? INITIAL_CUSTOMER_PROFILE,
        idDocumentName,
        idDocumentId: documentRefs.idDocumentId,
        contractName,
        contractDocumentId: documentRefs.contractDocumentId,
      }),
    [
      contractName,
      documentRefs.contractDocumentId,
      documentRefs.idDocumentId,
      idDocumentName,
      profile,
      storedCustomerProfile,
    ]
  );
  const checkoutProfileReadiness = useMemo(
    () => getCustomerProfileReadiness(checkoutCustomerProfile),
    [checkoutCustomerProfile]
  );

  const updateProfile =
    (field: keyof CheckoutProfile) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile(prev => ({ ...prev, [field]: event.target.value }));
    };

  const handleDocumentFile =
    (field: CheckoutDocumentField, setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setter(file?.name ?? '');
      setDocumentFiles(prev => ({ ...prev, [field]: file }));
      setDocumentUploadStates(prev => ({
        ...prev,
        [field]: file
          ? { status: 'selected', message: CHECKOUT_DOCUMENT_CONFIG[field].selectedMessage }
          : { status: 'idle', message: '' },
      }));
      if (!file) {
        setDocumentRefs(prev =>
          applyCheckoutUploadResult(prev, field, {
            id: '',
            type: CHECKOUT_DOCUMENT_CONFIG[field].documentType,
            status: 'under_review',
            fileName: '',
            storagePath: '',
            contentType: '',
            size: 0,
          })
        );
      }
    };

  const uploadCheckoutDocuments = async (user: User) => {
    let nextRefs = documentRefs;

    for (const field of Object.keys(CHECKOUT_DOCUMENT_CONFIG) as CheckoutDocumentField[]) {
      const file = documentFiles[field];
      if (!file) {
        continue;
      }

      setDocumentUploadStates(prev => ({
        ...prev,
        [field]: { status: 'uploading', message: 'Upload Firebase en cours...' },
      }));

      try {
        const result = await uploadCustomerDocument({
          user,
          file,
          documentType: CHECKOUT_DOCUMENT_CONFIG[field].documentType,
        });

        nextRefs = applyCheckoutUploadResult(nextRefs, field, result);
        setDocumentUploadStates(prev => ({
          ...prev,
          [field]: { status: 'uploaded', message: 'Document envoye pour verification.' },
        }));
      } catch (error) {
        setDocumentUploadStates(prev => ({
          ...prev,
          [field]: {
            status: 'failed',
            message: error instanceof Error ? error.message : 'Upload impossible pour ce document.',
          },
        }));
        throw error;
      }
    }

    setDocumentRefs(nextRefs);
    return nextRefs;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handlePrepareOrder();
  };

  const handleCaptureDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setDeliveryLocationMessage('Localisation indisponible sur ce navigateur.');
      return;
    }

    setIsCapturingLocation(true);
    setDeliveryLocationMessage('Recherche de votre position...');

    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLocation = buildDeliveryLocation(position);
        setDeliveryLocation(nextLocation);
        setDeliveryLocationMessage('Position ajoutee a la demande de livraison.');
        setIsCapturingLocation(false);
      },
      error => {
        setDeliveryLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Autorisez la localisation ou gardez une adresse detaillee.'
            : 'Position impossible a obtenir. Gardez une adresse detaillee.'
        );
        setIsCapturingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 15000,
      }
    );
  };

  const handlePrepareOrder = async () => {
    if (!canPrepareOrder || isCreatingOrder) {
      return;
    }

    const currentAuthUser = auth.currentUser || authUser;
    if (needsAuthenticatedProfile && !currentAuthUser) {
      setCheckoutError('Connectez ou creez un compte client avant paiement Kkiapay ou cotisation.');
      return;
    }

    setIsCreatingOrder(true);
    setCheckoutError('');
    let draft: ReturnType<typeof saveCheckoutDraft> | null = null;

    try {
      const uploadedRefs = currentAuthUser ? await uploadCheckoutDocuments(currentAuthUser) : documentRefs;

      if (needsCotisationDocuments && (!uploadedRefs.idDocumentId || !uploadedRefs.contractDocumentId)) {
        setCheckoutError('La cotisation exige une piece d identite et un contrat vraiment envoyes.');
        return;
      }

      const profileForOrder = buildCustomerProfileFromCheckout({
        checkoutProfile: profile,
        previousProfile: storedCustomerProfile ?? INITIAL_CUSTOMER_PROFILE,
        idDocumentName,
        idDocumentId: uploadedRefs.idDocumentId,
        contractName,
        contractDocumentId: uploadedRefs.contractDocumentId,
      });
      const savedProfile = saveCustomerProfileDraft(profileForOrder);
      setStoredCustomerProfile(savedProfile);
      setProfileLoadedFromAccount(true);

      draft = saveCheckoutDraft({
        paymentMode,
        fulfillmentMode,
        profile,
        items,
        totalQty,
        totalPrice,
        acceptedDeliveryFee: acceptDeliveryFee,
        deliveryLocation: fulfillmentMode === 'delivery' ? deliveryLocation : null,
        documents: {
          idDocumentName,
          idDocumentId: uploadedRefs.idDocumentId || null,
          contractName,
          contractDocumentId: uploadedRefs.contractDocumentId || null,
          representativeIdName,
          representativeIdDocumentId: uploadedRefs.representativeIdDocumentId || null,
        },
      });

      let idToken: string | null = null;
      if (currentAuthUser) {
        const syncedProfile = await syncCustomerProfileToFirestore(savedProfile, currentAuthUser);
        setStoredCustomerProfile(syncedProfile);
        idToken = await currentAuthUser.getIdToken();
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(draft),
      });
      const responseBody = (await response.json().catch(() => null)) as {
        orderId?: string;
        createdAt?: string;
        profileRequired?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !responseBody?.orderId) {
        const syncedDraft = updateCheckoutDraftOrderSync(draft, {
          status: 'failed',
          orderId: null,
          createdAt: null,
          error: responseBody?.message || 'Creation de commande indisponible.',
          profileRequired: false,
        });
        upsertCheckoutHistory(syncedDraft);
      } else {
        const syncedDraft = updateCheckoutDraftOrderSync(draft, {
          status: 'created',
          orderId: responseBody.orderId,
          createdAt: responseBody.createdAt || new Date().toISOString(),
          error: null,
          profileRequired: responseBody.profileRequired === true,
        });
        upsertCheckoutHistory(syncedDraft);
        clearCart();
      }
      router.push('/checkout/confirmation');
    } catch (error) {
      console.error('checkout: order creation failed', error);
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Creation de commande indisponible. Reessayez apres verification du serveur.'
      );
      if (draft) {
        const syncedDraft = updateCheckoutDraftOrderSync(draft, {
          status: 'failed',
          orderId: null,
          createdAt: null,
          error: 'Creation de commande indisponible.',
          profileRequired: false,
        });
        upsertCheckoutHistory(syncedDraft);
        router.push('/checkout/confirmation');
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Checkout"
          title="Choix de paiement et retrait"
          description="Brouillon local du futur parcours d achat : le profil devient obligatoire uniquement quand un paiement, un contrat ou un document entre en jeu."
        />

        <section className="grid gap-3 md:grid-cols-4">
          {PAYMENT_MODES.map(mode => (
            <ChoiceCard
              key={mode.id}
              active={paymentMode === mode.id}
              title={mode.title}
              tag={mode.tag}
              description={mode.description}
              onClick={() => {
                setPaymentMode(mode.id);
              }}
            />
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Mode de reception</p>
                  <h2 className="mt-1 text-xl font-black">Livraison, boutique ou representant</h2>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
                  Etape 1
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {FULFILLMENT_MODES.map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={fulfillmentMode === mode.id}
                    onClick={() => {
                      setFulfillmentMode(mode.id);
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      fulfillmentMode === mode.id
                        ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#059669]/30'
                    }`}
                  >
                    <span className="block text-sm font-black">{mode.title}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5">{mode.description}</span>
                  </button>
                ))}
              </div>

              {fulfillmentMode === 'delivery' ? (
                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={acceptDeliveryFee}
                      onChange={event => {
                        setAcceptDeliveryFee(event.target.checked);
                      }}
                      className="mt-1"
                    />
                    J accepte que les frais de livraison soient ajoutes selon ma zone.
                  </label>

                  <div className="rounded-2xl border border-[#059669]/15 bg-[#ECFDF5] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase text-[#059669]">Position de livraison</p>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                          Optionnel, mais utile pour guider le livreur.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCaptureDeliveryLocation}
                        disabled={isCapturingLocation}
                        className="rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white transition enabled:hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isCapturingLocation ? 'Recherche...' : 'Utiliser ma position'}
                      </button>
                    </div>
                    {deliveryLocation ? (
                      <a
                        href={deliveryLocation.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#059669]"
                      >
                        Ouvrir la position
                      </a>
                    ) : null}
                    {deliveryLocationMessage ? (
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{deliveryLocationMessage}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Identite</p>
                  <h2 className="mt-1 text-xl font-black">Informations client</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
                    {needsFullProfile ? 'Profil complet' : 'Profil leger'}
                  </span>
                  {profileLoadedFromAccount ? (
                    <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700">
                      Profil compte repris
                    </span>
                  ) : null}
                  {authUser ? (
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600">
                      Compte connecte
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Nom complet"
                  value={profile.fullName}
                  onChange={updateProfile('fullName')}
                  placeholder="Ex : Aline Hounkpe"
                />
                <Field
                  label="Numero WhatsApp"
                  value={profile.whatsapp}
                  onChange={updateProfile('whatsapp')}
                  placeholder="+229 01..."
                  type="tel"
                />
                <Field
                  label="Email"
                  value={profile.email}
                  onChange={updateProfile('email')}
                  placeholder="nom@email.com"
                  type="email"
                />
                <Field
                  label="Ville / quartier"
                  value={profile.city}
                  onChange={updateProfile('city')}
                  placeholder="Cotonou, Calavi..."
                />
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-extrabold uppercase text-slate-500">Adresse complete</span>
                <textarea
                  value={profile.address}
                  onChange={updateProfile('address')}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#059669] focus:bg-white focus:ring-2 focus:ring-[#059669]/10"
                  placeholder="Maison, rue, repere, zone de livraison..."
                />
              </label>
            </section>

            {needsRepresentative ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Representant</p>
                <h2 className="mt-1 text-xl font-black">Personne autorisee au retrait</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Nom du representant"
                    value={profile.representativeName}
                    onChange={updateProfile('representativeName')}
                    placeholder="Nom complet"
                  />
                  <Field
                    label="Telephone representant"
                    value={profile.representativePhone}
                    onChange={updateProfile('representativePhone')}
                    placeholder="+229 01..."
                    type="tel"
                  />
                </div>
                <div className="mt-3">
                  <FileField
                    label="Piece du representant optionnelle"
                    fileName={representativeIdName}
                    accept={getCustomerDocumentAccept('representative_identity_card')}
                    uploadState={documentUploadStates.representativeId}
                    onChange={handleDocumentFile('representativeId', setRepresentativeIdName)}
                  />
                </div>
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                  Alternative conservee : le client peut appeler AfricaPhone pour confirmer le representant.
                </p>
              </section>
            ) : null}

            {needsCotisationDocuments ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Cotisation</p>
                <h2 className="mt-1 text-xl font-black">Documents avant activation du contrat</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FileField
                    label="Piece d identite valide"
                    fileName={idDocumentName}
                    accept={getCustomerDocumentAccept('identity_card')}
                    uploadState={documentUploadStates.idDocument}
                    onChange={handleDocumentFile('idDocument', setIdDocumentName)}
                  />
                  <FileField
                    label="Contrat signe"
                    fileName={contractName}
                    accept={getCustomerDocumentAccept('signed_contract')}
                    uploadState={documentUploadStates.contract}
                    onChange={handleDocumentFile('contract', setContractName)}
                  />
                </div>
                <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-bold text-[#059669]">
                  Les paiements Kkiapay successifs seront branches apres validation du modele de contrat.
                </p>
              </section>
            ) : null}
          </form>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Resume panier</p>
              {items.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-extrabold text-slate-950">Aucun article choisi.</p>
                  <Link
                    href="/"
                    className="mt-3 inline-flex rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white"
                  >
                    Choisir des produits
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-extrabold text-slate-950">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-500">Quantite : {item.qty}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[#059669]">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-600">
                    <span>{totalQty} article(s)</span>
                    <span className="text-lg font-black text-[#059669]">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Validation avant paiement</p>
              <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase text-slate-500">Profil local</p>
                  <p className="text-sm font-black text-[#059669]">{checkoutProfileReadiness.completion}%</p>
                </div>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  {!authReady
                    ? 'Verification du compte client...'
                    : needsAuthenticatedProfile && !authUser
                      ? 'Compte client requis avant paiement'
                      : checkoutProfileReadiness.cotisationReady
                        ? 'Pret pour cotisation'
                        : checkoutProfileReadiness.fullReady
                          ? 'Pret pour paiement Kkiapay'
                          : checkoutProfileReadiness.lightReady
                            ? 'Pret pour paiement a la livraison'
                            : 'Identite minimale encore incomplete'}
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {requirements.map(requirement => (
                  <div key={requirement.label} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                        requirement.done ? 'bg-[#059669] text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {requirement.done ? 'OK' : '!'}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{requirement.label}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrepareOrder}
                disabled={!authReady || !canPrepareOrder || isCreatingOrder}
                className="mt-5 h-12 w-full rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition enabled:hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isCreatingOrder ? 'Creation de la commande...' : 'Preparer la demande'}
              </button>

              {checkoutError ? (
                <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                  {checkoutError}
                </p>
              ) : null}

              {missingRequirements.length > 0 ? (
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                  Completez les conditions restantes pour activer la demande.
                  {needsAuthenticatedProfile && !authUser ? (
                    <>
                      {' '}
                      <Link href="/compte" className="font-extrabold text-[#059669]">
                        Ouvrir Compte
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                  Aucun paiement reel n est lance dans cette version locale.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function ChoiceCard({
  active,
  title,
  tag,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  tag: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left shadow-sm transition ${
        active
          ? 'border-[#059669] bg-[#ECFDF5] shadow-[#059669]/10'
          : 'border-slate-200 bg-white shadow-slate-200/70 hover:border-[#059669]/30'
      }`}
    >
      <span className={`text-xs font-extrabold uppercase ${active ? 'text-[#059669]' : 'text-slate-500'}`}>{tag}</span>
      <span className="mt-2 block text-base font-black text-slate-950">{title}</span>
      <span className="mt-2 block text-sm font-semibold leading-6 text-slate-600">{description}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase text-slate-500">{label}</span>
      <input
        value={value}
        onChange={onChange}
        type={type}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#059669] focus:bg-white focus:ring-2 focus:ring-[#059669]/10"
        placeholder={placeholder}
      />
    </label>
  );
}

function FileField({
  label,
  fileName,
  accept,
  uploadState,
  onChange,
}: {
  label: string;
  fileName: string;
  accept: string;
  uploadState: UploadState;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
      <span className="text-xs font-extrabold uppercase text-slate-500">{label}</span>
      <input type="file" accept={accept} onChange={onChange} className="sr-only" />
      <span className="mt-2 block truncate text-sm font-extrabold text-slate-950">{fileName || 'Importer'}</span>
      {uploadState.message ? (
        <span
          className={`mt-2 block text-[11px] font-bold ${
            uploadState.status === 'failed'
              ? 'text-orange-700'
              : uploadState.status === 'uploaded'
                ? 'text-[#059669]'
                : 'text-slate-500'
          }`}
        >
          {uploadState.message}
        </span>
      ) : null}
    </label>
  );
}
