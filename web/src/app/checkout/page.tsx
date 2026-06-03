'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { type CartItem, subscribeToCart } from '@/lib/cart';
import { formatPrice } from '@/utils/formatPrice';

type PaymentMode = 'delivery' | 'kkiapay' | 'pickup' | 'cotisation';
type FulfillmentMode = 'delivery' | 'shop' | 'representative';

type CheckoutProfile = {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  address: string;
  representativeName: string;
  representativePhone: string;
};

const PAYMENT_MODES: Array<{
  id: PaymentMode;
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
    title: 'Payer ou retirer en boutique',
    tag: 'Retrait',
    description: 'Le client peut payer en avance ou confirmer le retrait avec AfricaPhone.',
  },
  {
    id: 'cotisation',
    title: 'Acheter par cotisation',
    tag: 'Contrat',
    description: 'Piece d identite, contrat signe et echeancier avant paiements Kkiapay.',
  },
];

const FULFILLMENT_MODES: Array<{
  id: FulfillmentMode;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('delivery');
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('delivery');
  const [profile, setProfile] = useState<CheckoutProfile>(initialProfile);
  const [acceptDeliveryFee, setAcceptDeliveryFee] = useState(false);
  const [idDocumentName, setIdDocumentName] = useState('');
  const [contractName, setContractName] = useState('');
  const [representativeIdName, setRepresentativeIdName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => subscribeToCart(setItems), []);

  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price * item.qty : 0), 0),
    [items]
  );

  const needsFullProfile = paymentMode === 'kkiapay' || paymentMode === 'cotisation';
  const needsCotisationDocuments = paymentMode === 'cotisation';
  const needsRepresentative = fulfillmentMode === 'representative';
  const needsDeliveryFee = fulfillmentMode === 'delivery';

  const requirements = useMemo(() => {
    const base = [
      { label: 'Nom complet du client', done: profile.fullName.trim().length >= 3 },
      { label: 'Numero WhatsApp fonctionnel', done: profile.whatsapp.trim().length >= 8 },
    ];

    const fullProfile = needsFullProfile
      ? [
          { label: 'Email complet et fonctionnel', done: profile.email.includes('@') },
          { label: 'Ville ou quartier', done: profile.city.trim().length >= 2 },
          { label: 'Adresse complete', done: profile.address.trim().length >= 6 },
        ]
      : [];

    const delivery = needsDeliveryFee
      ? [
          { label: 'Adresse de livraison', done: profile.address.trim().length >= 6 },
          { label: 'Acceptation des frais de livraison', done: acceptDeliveryFee },
        ]
      : [];

    const representative = needsRepresentative
      ? [{ label: 'Nom du representant', done: profile.representativeName.trim().length >= 3 }]
      : [];

    const cotisation = needsCotisationDocuments
      ? [
          { label: 'Piece d identite valide', done: idDocumentName.length > 0 },
          { label: 'Contrat signe importe', done: contractName.length > 0 },
        ]
      : [];

    return [...base, ...fullProfile, ...delivery, ...representative, ...cotisation];
  }, [
    acceptDeliveryFee,
    contractName,
    idDocumentName,
    needsCotisationDocuments,
    needsDeliveryFee,
    needsFullProfile,
    needsRepresentative,
    profile,
  ]);

  const missingRequirements = requirements.filter(requirement => !requirement.done);
  const canPrepareOrder = items.length > 0 && missingRequirements.length === 0;

  const updateProfile = (field: keyof CheckoutProfile) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSubmitted(false);
    setProfile(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleFile = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setSubmitted(false);
    setter(event.target.files?.[0]?.name ?? '');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(canPrepareOrder);
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
                setSubmitted(false);
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
                      setSubmitted(false);
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
                <label className="mt-4 flex items-start gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={acceptDeliveryFee}
                    onChange={event => {
                      setSubmitted(false);
                      setAcceptDeliveryFee(event.target.checked);
                    }}
                    className="mt-1"
                  />
                  J accepte que les frais de livraison soient ajoutes selon ma zone.
                </label>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Identite</p>
                  <h2 className="mt-1 text-xl font-black">Informations client</h2>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
                  {needsFullProfile ? 'Profil complet' : 'Profil leger'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Nom complet" value={profile.fullName} onChange={updateProfile('fullName')} placeholder="Ex : Aline Hounkpe" />
                <Field label="Numero WhatsApp" value={profile.whatsapp} onChange={updateProfile('whatsapp')} placeholder="+229 01..." type="tel" />
                <Field label="Email" value={profile.email} onChange={updateProfile('email')} placeholder="nom@email.com" type="email" />
                <Field label="Ville / quartier" value={profile.city} onChange={updateProfile('city')} placeholder="Cotonou, Calavi..." />
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
                  <FileField label="Piece du representant optionnelle" fileName={representativeIdName} onChange={handleFile(setRepresentativeIdName)} />
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
                  <FileField label="Piece d identite valide" fileName={idDocumentName} onChange={handleFile(setIdDocumentName)} />
                  <FileField label="Contrat signe" fileName={contractName} onChange={handleFile(setContractName)} />
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
                  <Link href="/" className="mt-3 inline-flex rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white">
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
                onClick={() => setSubmitted(canPrepareOrder)}
                disabled={!canPrepareOrder}
                className="mt-5 h-12 w-full rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition enabled:hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Preparer la demande
              </button>

              {submitted ? (
                <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-sm font-extrabold text-[#059669]">
                  Brouillon pret. Prochaine etape : brancher creation de commande et paiement Kkiapay.
                </p>
              ) : missingRequirements.length > 0 ? (
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                  Completez les conditions restantes pour activer la demande.
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
  onChange,
}: {
  label: string;
  fileName: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
      <span className="text-xs font-extrabold uppercase text-slate-500">{label}</span>
      <input type="file" onChange={onChange} className="sr-only" />
      <span className="mt-2 block truncate text-sm font-extrabold text-slate-950">{fileName || 'Importer'}</span>
    </label>
  );
}
