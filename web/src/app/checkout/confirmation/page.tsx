'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  type CheckoutDraft,
  FULFILLMENT_MODE_LABELS,
  getCheckoutDraft,
  NEXT_STEP_MESSAGES,
  PAYMENT_MODE_LABELS,
} from '@/lib/checkoutDraft';
import { formatPrice } from '@/utils/formatPrice';

export default function CheckoutConfirmationPage() {
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft(getCheckoutDraft());
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Confirmation"
          title="Demande recue"
          description="Recapitulatif de votre demande avant confirmation du stock, de la livraison, du retrait ou de la cotisation."
        />

        {!loaded ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-500">Chargement de la demande...</p>
          </section>
        ) : draft ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              <article className="rounded-3xl border border-[#059669]/20 bg-[#ECFDF5] p-4 shadow-sm shadow-[#059669]/10">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Numero provisoire</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">{draft.id}</h2>
                  <span
                    className={`rounded-full bg-white px-3 py-2 text-xs font-extrabold ${
                      draft.orderSync.status === 'created' ? 'text-[#059669]' : 'text-orange-700'
                    }`}
                  >
                    {draft.orderSync.status === 'created'
                      ? draft.orderSync.profileRequired
                        ? 'Commande creee - profil requis'
                        : 'Demande envoyee a AfricaPhone'
                      : 'Enregistrement a reprendre'}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  Cette reference permet de reprendre ou suivre la demande avec l equipe AfricaPhone.
                </p>
                {draft.orderSync.status === 'created' && draft.orderSync.profileRequired ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                    Cette commande existe, mais le paiement ou la cotisation doit attendre un profil client identifie.
                  </p>
                ) : null}
                {draft.orderSync.status === 'failed' ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                    {draft.orderSync.error || 'La demande reste sauvegardee localement. Reessayez apres verification du serveur.'}
                  </p>
                ) : null}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Articles</p>
                <div className="mt-4 space-y-3">
                  {draft.items.map(item => (
                    <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-extrabold text-slate-950">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-500">Quantite : {item.qty}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[#059669]">
                          {formatPrice(typeof item.price === 'number' ? item.price * item.qty : null)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Client</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SummaryItem label="Nom" value={draft.profile.fullName} />
                  <SummaryItem label="WhatsApp" value={draft.profile.whatsapp} />
                  <SummaryItem label="Email" value={draft.profile.email || 'Non renseigne'} />
                  <SummaryItem label="Ville" value={draft.profile.city || 'Non renseignee'} />
                </div>
                {draft.profile.address ? (
                  <div className="mt-3">
                    <SummaryItem label="Adresse" value={draft.profile.address} />
                  </div>
                ) : null}
                {draft.fulfillmentMode === 'delivery' && draft.deliveryLocation?.mapUrl ? (
                  <a
                    href={draft.deliveryLocation.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex rounded-full bg-[#ECFDF5] px-4 py-2 text-xs font-extrabold text-[#059669]"
                  >
                    Ouvrir la position de livraison
                  </a>
                ) : null}
              </article>

              {draft.fulfillmentMode === 'representative' ? (
                <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Representant</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryItem label="Nom" value={draft.profile.representativeName} />
                    <SummaryItem label="Telephone" value={draft.profile.representativePhone || 'A confirmer'} />
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    Piece importee : {draft.documents.representativeIdName || 'non fournie, appel possible pour confirmation'}
                  </p>
                </article>
              ) : null}

              {draft.paymentMode === 'cotisation' ? (
                <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Documents cotisation</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryItem label="Piece d identite" value={draft.documents.idDocumentName || 'Manquante'} />
                    <SummaryItem label="Contrat signe" value={draft.documents.contractName || 'Manquant'} />
                  </div>
                </article>
              ) : null}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Resume</p>
                <div className="mt-4 space-y-3">
                  <SummaryItem label="Mode paiement" value={PAYMENT_MODE_LABELS[draft.paymentMode]} />
                  <SummaryItem label="Reception" value={FULFILLMENT_MODE_LABELS[draft.fulfillmentMode]} />
                  <SummaryItem label="Articles" value={`${draft.totalQty} article(s)`} />
                  <SummaryItem label="Total indicatif" value={formatPrice(draft.totalPrice)} strong />
                  {draft.fulfillmentMode === 'delivery' ? (
                    <SummaryItem
                      label="Frais livraison"
                      value={draft.acceptedDeliveryFee ? 'Acceptes, montant a confirmer' : 'Non acceptes'}
                    />
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Prochaine etape</p>
                <p className="mt-3 text-sm font-extrabold leading-6 text-slate-950">
                  {NEXT_STEP_MESSAGES[draft.paymentMode]}
                </p>
                <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                  Aucun paiement Kkiapay n est lance dans cette version.
                </p>
              </section>

              <div className="grid gap-3">
                <Link
                  href="/checkout"
                  className="flex h-12 items-center justify-center rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition hover:bg-[#EA580C]"
                >
                  Modifier la demande
                </Link>
                <Link
                  href="/commandes"
                  className="flex h-12 items-center justify-center rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] text-sm font-extrabold text-[#059669]"
                >
                  Voir commandes
                </Link>
              </div>
            </aside>
          </div>
        ) : (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-xs font-extrabold uppercase text-[#059669]">Aucune demande</p>
            <h2 className="mt-2 text-2xl font-black">Aucune confirmation en attente</h2>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Preparez une demande depuis le checkout pour afficher son recapitulatif ici.
            </p>
            <Link href="/checkout" className="mt-5 rounded-full bg-[#059669] px-5 py-2.5 text-sm font-extrabold text-white">
              Ouvrir le checkout
            </Link>
          </section>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}

function SummaryItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-black text-[#059669]' : 'font-extrabold text-slate-950'}`}>{value}</p>
    </div>
  );
}
