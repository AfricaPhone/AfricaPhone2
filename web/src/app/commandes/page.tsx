'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { type CartItem, subscribeToCart } from '@/lib/cart';
import { formatPrice } from '@/utils/formatPrice';

const PAYMENT_CHOICES = [
  {
    title: 'Payer a la livraison',
    description: 'Le client confirme son identite minimale, son WhatsApp et son adresse. Pas de compte complet obligatoire.',
    tag: 'Profil leger',
  },
  {
    title: 'Payer maintenant',
    description: 'Kkiapay sera lance apres creation du profil complet pour identifier clairement le payeur.',
    tag: 'Profil obligatoire',
  },
  {
    title: 'Retrait ou representant',
    description: 'Le client peut passer lui-meme, envoyer un representant identifie ou appeler AfricaPhone pour confirmer.',
    tag: 'Controle retrait',
  },
  {
    title: 'Cotisation',
    description: 'Contrat signe, piece d identite, echeancier et paiements Kkiapay successifs.',
    tag: 'Dossier complet',
  },
];

const ORDER_STATUSES = [
  { label: 'En preparation', value: 'Commande recue, disponibilite a confirmer' },
  { label: 'Paiement attendu', value: 'Kkiapay ou paiement livraison selon choix' },
  { label: 'Pret au retrait', value: 'Client ou representant autorise peut passer' },
  { label: 'Livre', value: 'Livraison terminee et archivee' },
];

export default function OrdersPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [representative, setRepresentative] = useState('');
  const [acceptDeliveryFee, setAcceptDeliveryFee] = useState(false);

  useEffect(() => subscribeToCart(setItems), []);

  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price * item.qty : 0), 0),
    [items]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Commandes"
          title="Suivi et choix de paiement"
          description="Cet espace prepare le futur checkout : livraison, paiement a la livraison, paiement Kkiapay, retrait boutique, representant et cotisation."
        />

        <section className="grid gap-3 md:grid-cols-4">
          {PAYMENT_CHOICES.map(choice => (
            <article key={choice.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">{choice.tag}</p>
              <h2 className="mt-2 text-base font-black text-slate-950">{choice.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{choice.description}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Panier courant</p>
                  <h2 className="mt-1 text-xl font-black">Preparation de commande</h2>
                </div>
                <Link
                  href="/panier"
                  className="rounded-full border border-[#059669]/20 bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]"
                >
                  Modifier
                </Link>
              </div>

              {items.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm font-extrabold text-slate-950">Aucune selection en attente.</p>
                  <Link href="/" className="mt-3 inline-flex rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white">
                    Choisir des produits
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950">{item.name}</p>
                        <p className="text-xs font-semibold text-slate-500">Quantite : {item.qty}</p>
                      </div>
                      <p className="text-sm font-black text-[#059669]">{formatPrice(item.price)}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Livraison et retrait</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <OptionCard
                  active={deliveryMode === 'delivery'}
                  title="Livraison"
                  description="Le client accepte les frais selon la zone."
                  onClick={() => setDeliveryMode('delivery')}
                />
                <OptionCard
                  active={deliveryMode === 'pickup'}
                  title="Retrait client"
                  description="Le client passe en boutique apres confirmation."
                  onClick={() => setDeliveryMode('pickup')}
                />
                <OptionCard
                  active={deliveryMode === 'representative'}
                  title="Representant"
                  description="Identite du representant a confirmer."
                  onClick={() => setDeliveryMode('representative')}
                />
              </div>

              {deliveryMode === 'delivery' ? (
                <label className="mt-4 flex items-start gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={acceptDeliveryFee}
                    onChange={event => setAcceptDeliveryFee(event.target.checked)}
                    className="mt-1"
                  />
                  J accepte que les frais de livraison soient ajoutes selon ma zone.
                </label>
              ) : null}

              {deliveryMode === 'representative' ? (
                <label className="mt-4 block">
                  <span className="text-xs font-extrabold uppercase text-slate-500">Nom du representant</span>
                  <input
                    value={representative}
                    onChange={event => setRepresentative(event.target.value)}
                    placeholder="Nom complet et telephone si possible"
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-[#059669] focus:bg-white"
                  />
                  <span className="mt-2 block text-xs font-semibold text-slate-500">
                    L import de sa piece d identite sera ajoute au moment du branchement documents.
                  </span>
                </label>
              ) : null}
            </article>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Resume</p>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Articles</span>
                  <span className="font-black text-slate-950">{totalQty}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span>Total indicatif</span>
                  <span className="font-black text-[#059669]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <button className="mt-5 h-12 w-full rounded-2xl bg-[#F97316] text-sm font-extrabold text-white">
                Continuer le checkout
              </button>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Le paiement reel sera branche apres validation du parcours.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Statuts prevus</p>
              <div className="mt-3 space-y-2">
                {ORDER_STATUSES.map(status => (
                  <div key={status.label} className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-sm font-black text-slate-950">{status.label}</p>
                    <p className="text-xs font-semibold text-slate-500">{status.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left transition ${
        active ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]' : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-1 block text-xs font-semibold leading-5">{description}</span>
    </button>
  );
}
