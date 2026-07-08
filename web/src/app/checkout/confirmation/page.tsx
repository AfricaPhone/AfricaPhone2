'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { PAYMENT_CONFIG } from '@/config/payment';
import {
  type CheckoutDraft,
  FULFILLMENT_MODE_LABELS,
  formatCheckoutReference,
  getCheckoutDraft,
  NEXT_STEP_MESSAGES,
  PAYMENT_MODE_LABELS,
} from '@/lib/checkoutDraft';
import { auth } from '@/lib/firebaseClient';
import { loadKkiapay, type KkiapayListenerData } from '@/lib/kkiapay';
import { downloadPaymentReceipt } from '@/lib/paymentReceipts';
import { formatPrice } from '@/utils/formatPrice';

type InitiatePaymentResponse = {
  paymentId: string;
  providerReference: string;
  amount: number;
  currency: 'XOF';
  status?: string;
  reused?: boolean;
  publicKey: string;
  sandbox: boolean;
  customer: {
    name: string;
    email: string | null;
    phone: string;
  };
  message?: string;
};

type VerifyPaymentResponse = {
  payment?: {
    id: string;
    status: string;
    amount: number;
    providerTransactionId: string | null;
  };
  message?: string;
};

type PostPaymentModalState = {
  kind: 'success' | 'pending' | 'attention';
  title: string;
  body: string;
  orderId?: string | null;
  transactionId?: string | null;
};

type PaymentPanelStatus = 'idle' | 'starting' | 'opened' | 'verifying' | 'succeeded' | 'failed' | 'blocked';

const getKkiapayTransactionId = (data?: KkiapayListenerData) =>
  (data?.transactionId && String(data.transactionId)) || (data?.flwRef && String(data.flwRef)) || null;

const closeKkiapayWidgetSafely = async () => {
  try {
    const instance = await loadKkiapay();
    instance.closeKkiapayWidget?.();
  } catch {
    // The widget may already be closed by Kkiapay.
  }
};

const getPaidOrderNextStepMessage = (draft: CheckoutDraft) => {
  if (draft.fulfillmentMode === 'delivery') {
    return 'Paiement confirme. AfricaPhone controle maintenant votre demande puis vous contacte sur votre numero pour organiser la livraison. Gardez votre telephone disponible; le lieu exact peut etre confirme avec le livreur si necessaire.';
  }

  if (draft.fulfillmentMode === 'representative') {
    const representativeName = draft.profile.representativeName?.trim();
    const representativePhone = draft.profile.representativePhone?.trim();
    const representative = representativeName
      ? `${representativeName}${representativePhone ? ` (${representativePhone})` : ''}`
      : 'votre representant';

    return `Paiement confirme. Donnez maintenant l'ordre a ${representative} de recuperer le produit chez AfricaPhone. Il doit venir avec sa piece d'identite; AfricaPhone controlera son identite avant toute remise.`;
  }

  return "Paiement confirme. AfricaPhone controle maintenant votre demande. Vous pourrez passer en boutique avec votre reference de commande et une piece d'identite des que la remise est autorisee.";
};

const getPendingPaymentInstructionMessage = (draft: CheckoutDraft) => {
  const phone = draft.profile.whatsapp?.trim();
  const phonePart = phone ? ` sur le numero ${phone}` : ' sur le numero utilise pour le paiement';

  return `Une demande de validation vient d'etre envoyee${phonePart}. Prenez votre telephone maintenant, ouvrez la notification operateur ou Mobile Money, saisissez votre code secret si demande, puis confirmez. Ne relancez pas le paiement tant que cette validation est en attente.`;
};

const enforceKkiapayViewport = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const applyStyle = () => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[src^="https://widget-v3.kkiapay.me"]');
    if (!iframe) {
      return false;
    }

    const style = iframe.style;
    style.setProperty('height', '100vh', 'important');
    style.setProperty('width', '100vw', 'important');
    style.setProperty('maxHeight', '100vh', 'important');
    style.setProperty('maxWidth', '100vw', 'important');
    style.setProperty('top', '0');
    style.setProperty('left', '0');
    style.setProperty('position', 'fixed');

    return true;
  };

  if (!applyStyle()) {
    window.setTimeout(applyStyle, 80);
  }
};

export default function CheckoutConfirmationPage() {
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const shouldAutoStartPayment = searchParams.get('pay') === '1';

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
        />

        {!loaded ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-500">Chargement de la demande...</p>
          </section>
        ) : draft ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              <article className="rounded-3xl border border-[#059669]/20 bg-[#ECFDF5] p-4 shadow-sm shadow-[#059669]/10">
                <p className="text-xs font-extrabold uppercase text-[#059669]">
                  {draft.orderSync.referenceCode ? 'Numero de demande' : 'Numero provisoire'}
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {formatCheckoutReference(draft.orderSync.referenceCode || draft.id)}
                  </h2>
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
                {draft.orderSync.status === 'created' && draft.orderSync.profileRequired ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                    Cette commande existe, mais le paiement ou la cotisation doit attendre un profil client identifie.
                  </p>
                ) : null}
                {draft.orderSync.status === 'failed' ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                    La demande n a pas pu etre transmise. Reessayez ou contactez AfricaPhone.
                  </p>
                ) : null}
              </article>

              {draft.paymentMode === 'kkiapay' ? (
                <article className="rounded-3xl border border-[#059669]/20 bg-[#ECFDF5] p-4 shadow-sm shadow-[#059669]/10">
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Paiement maintenant</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Ouverture Kkiapay</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Le paiement s ouvre automatiquement apres creation de la demande. Si rien ne s affiche,
                    utilisez le bouton ci-dessous.
                  </p>
                  <KkiapayPaymentPanel draft={draft} autoStart={shouldAutoStartPayment} />
                </article>
              ) : null}

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
                {draft.paymentMode === 'kkiapay' ? (
                  <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-bold leading-5 text-[#059669]">
                    Kkiapay doit s ouvrir automatiquement. Le bouton de secours est place en haut de la page.
                  </p>
                ) : (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                    {draft.paymentMode === 'delivery'
                      ? 'AfricaPhone confirme les frais de livraison avant depart du livreur.'
                      : draft.paymentMode === 'cotisation'
                        ? 'Le contrat doit etre verifie avant activation des cotisations.'
                        : 'AfricaPhone confirme le stock avant votre passage en boutique.'}
                  </p>
                )}
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
              Preparez une demande d achat pour afficher son recapitulatif ici.
            </p>
            <Link href="/checkout" className="mt-5 rounded-full bg-[#059669] px-5 py-2.5 text-sm font-extrabold text-white">
              Preparer une demande
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

function KkiapayPaymentPanel({ draft, autoStart = false }: { draft: CheckoutDraft; autoStart?: boolean }) {
  const pendingPaymentRef = useRef<{ orderId: string; paymentId: string; providerReference: string } | null>(null);
  const autoStartRef = useRef(false);
  const [status, setStatus] = useState<PaymentPanelStatus>('idle');
  const [message, setMessage] = useState('');
  const [sandboxMode, setSandboxMode] = useState<boolean | null>(null);
  const [kkiapayReady, setKkiapayReady] = useState(false);
  const [postPaymentModal, setPostPaymentModal] = useState<PostPaymentModalState | null>(null);
  const orderId = draft.orderSync.orderId;
  const canPay = draft.orderSync.status === 'created' && !draft.orderSync.profileRequired && Boolean(orderId);
  const paymentLocked = ['starting', 'opened', 'verifying', 'succeeded', 'blocked'].includes(status);

  useEffect(() => {
    if (!orderId) {
      return () => {};
    }

    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        return;
      }

      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({
          orderIds: orderId,
          localDraftIds: draft.id,
        });
        const response = await fetch(`/api/orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = (await response.json().catch(() => null)) as {
          orders?: Array<{ id: string; paymentStatus?: string; status?: string }>;
        } | null;
        const remoteOrder = body?.orders?.find(order => order.id === orderId);

        if (disposed || !response.ok || !remoteOrder) {
          return;
        }

        if (remoteOrder.paymentStatus === 'succeeded') {
          setStatus('succeeded');
          setMessage('Paiement deja confirme. Le recu est disponible dans l application.');
        } else if (remoteOrder.paymentStatus === 'provider_opened') {
          setMessage('Un paiement Kkiapay est deja ouvert pour cette demande. Reprenez uniquement si vous n avez pas encore valide sur votre telephone.');
        }
      } catch {
        // Le suivi client reste disponible meme si la prelecture echoue.
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [draft.id, orderId]);

  const verifyPayment = useCallback(
    async (data?: KkiapayListenerData) => {
      const pendingPayment = pendingPaymentRef.current;
      const transactionId = getKkiapayTransactionId(data);
      const eventPartnerId = typeof data?.partnerId === 'string' ? data.partnerId.trim() : '';

      if (!pendingPayment || !transactionId) {
        setStatus('blocked');
        setMessage('Retour Kkiapay incomplet. Ne relancez pas le paiement; contactez AfricaPhone avec la capture du paiement.');
        setPostPaymentModal({
          kind: 'attention',
          title: 'Paiement a controler',
          body: 'Kkiapay a renvoye une information incomplete. Ne refaites pas le paiement tant qu AfricaPhone n a pas controle la transaction.',
        });
        return;
      }

      if (eventPartnerId && eventPartnerId !== pendingPayment.providerReference) {
        setStatus('blocked');
        setMessage('Retour Kkiapay non rattache a cette demande. Ne relancez pas le paiement; AfricaPhone doit controler la transaction.');
        setPostPaymentModal({
          kind: 'attention',
          title: 'Controle paiement requis',
          body: 'Kkiapay a signale une transaction qui ne correspond pas a la reference ouverte pour cette demande. Ne payez pas une seconde fois; contactez AfricaPhone avec la capture du paiement.',
          transactionId,
        });
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setStatus('failed');
        setMessage('Reconnectez votre compte client pour confirmer le paiement.');
        return;
      }

      setStatus('verifying');
      setMessage('Verification securisee du paiement...');

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/payments/kkiapay/verify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: pendingPayment.orderId,
            paymentId: pendingPayment.paymentId,
            transactionId,
          }),
        });
        const body = (await response.json().catch(() => null)) as VerifyPaymentResponse | null;

        if (!response.ok || body?.payment?.status !== 'succeeded') {
          const serverMessage = body?.message || 'Paiement non confirme par le serveur.';
          if (/deja payee/i.test(serverMessage)) {
            setStatus('succeeded');
            setMessage('Paiement deja confirme. Le recu est disponible dans l application.');
            await closeKkiapayWidgetSafely();
            setPostPaymentModal({
              kind: 'success',
              title: 'Paiement deja confirme',
              body: getPaidOrderNextStepMessage(draft),
              orderId: pendingPayment.orderId,
              transactionId,
            });
            return;
          }

          if (/incoherent|incoherente/i.test(serverMessage)) {
            setStatus('blocked');
            setMessage(`${serverMessage} Ne relancez pas le paiement; AfricaPhone doit controler la transaction.`);
            setPostPaymentModal({
              kind: 'attention',
              title: 'Controle paiement requis',
              body: 'Kkiapay a signale un paiement, mais la reference ne correspond pas parfaitement a cette demande. Ne payez pas une seconde fois; AfricaPhone doit controler la transaction.',
              transactionId,
            });
            return;
          }

          throw new Error(serverMessage);
        }

        setStatus('succeeded');
        setMessage('Paiement confirme. Le recu est disponible dans l application.');
        await closeKkiapayWidgetSafely();
        setPostPaymentModal({
          kind: 'success',
          title: 'Merci, paiement confirme',
          body: getPaidOrderNextStepMessage(draft),
          orderId: pendingPayment.orderId,
          transactionId,
        });
      } catch (error) {
        setStatus('failed');
        setMessage(error instanceof Error ? error.message : 'Verification Kkiapay impossible.');
      }
    },
    [draft]
  );

  const handlePaymentFailed = useCallback(() => {
    setStatus('failed');
    setMessage('Le paiement Kkiapay n a pas abouti.');
  }, []);

  const handlePaymentInterrupted = useCallback(() => {
    setStatus(currentStatus => {
      if (currentStatus === 'succeeded' || currentStatus === 'verifying' || currentStatus === 'blocked') {
        return currentStatus;
      }

      return 'failed';
    });
    setMessage('La fenetre Kkiapay a ete fermee ou interrompue avant confirmation. Vous pouvez reprendre le meme paiement si rien n a ete debite.');
  }, []);

  const handlePaymentPending = useCallback(() => {
    setStatus('opened');
    setMessage('Paiement en cours de confirmation par Kkiapay.');
    void closeKkiapayWidgetSafely();
    setPostPaymentModal({
      kind: 'pending',
      title: 'Validez sur votre telephone',
      body: getPendingPaymentInstructionMessage(draft),
    });
  }, [draft]);

  useEffect(() => {
    let disposed = false;
    let moduleInstance: Awaited<ReturnType<typeof loadKkiapay>> | null = null;

    loadKkiapay()
      .then(instance => {
        if (disposed) {
          return;
        }
        moduleInstance = instance;
        instance.addSuccessListener(verifyPayment);
        instance.addFailedListener(handlePaymentFailed);
        instance.addPendingListener(handlePaymentPending);
        instance.addPaymentAbortedListener(handlePaymentInterrupted);
        instance.addKkiapayCloseListener(handlePaymentInterrupted);
        setKkiapayReady(true);
      })
      .catch(() => {
        if (!disposed) {
          setMessage('Module Kkiapay indisponible pour le moment.');
        }
      });

    return () => {
      disposed = true;
      moduleInstance?.removeKkiapayListener?.('success');
      moduleInstance?.removeKkiapayListener?.('failed');
      moduleInstance?.addPendingListener(() => {});
      moduleInstance?.addPaymentAbortedListener(() => {});
      moduleInstance?.addKkiapayCloseListener(() => {});
    };
  }, [handlePaymentFailed, handlePaymentInterrupted, handlePaymentPending, verifyPayment]);

  const startPayment = useCallback(async () => {
    if (!canPay || !orderId || paymentLocked) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setStatus('failed');
      setMessage('Connectez votre compte client avant le paiement en ligne.');
      return;
    }

    setStatus('starting');
    setMessage('Preparation du paiement securise...');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/payments/kkiapay/initiate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json().catch(() => null)) as InitiatePaymentResponse | null;

      if (!response.ok || !body?.paymentId || !body.publicKey) {
        throw new Error(body?.message || 'Preparation du paiement indisponible.');
      }

      pendingPaymentRef.current = { orderId, paymentId: body.paymentId, providerReference: body.providerReference };
      setSandboxMode(body.sandbox);
      const moduleInstance = await loadKkiapay();
      moduleInstance.openKkiapayWidget({
        amount: body.amount,
        publicAPIKey: body.publicKey,
        sandbox: body.sandbox,
        theme: PAYMENT_CONFIG.PRODUCT_PAYMENT_THEME,
        partnerId: body.providerReference,
        name: body.customer.name,
        email: body.customer.email || undefined,
        phone: body.customer.phone,
        countries: PAYMENT_CONFIG.COUNTRIES ? [...PAYMENT_CONFIG.COUNTRIES] : undefined,
        paymentMethods: PAYMENT_CONFIG.PAYMENT_METHODS ? [...PAYMENT_CONFIG.PAYMENT_METHODS] : undefined,
      });
      enforceKkiapayViewport();
      setStatus('opened');
      setMessage(
        body.reused
          ? 'Paiement deja prepare. Finalisez cette meme transaction dans la fenetre Kkiapay.'
          : 'Finalisez le paiement dans la fenetre Kkiapay.'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de lancer Kkiapay.';
      if (/deja payee/i.test(errorMessage)) {
        setStatus('succeeded');
        setMessage('Paiement deja confirme. Le recu est disponible dans l application.');
        return;
      }

      setStatus('failed');
      setMessage(errorMessage);
    }
  }, [canPay, orderId, paymentLocked]);

  useEffect(() => {
    if (!autoStart || autoStartRef.current || !canPay || !kkiapayReady || status !== 'idle') {
      return;
    }

    autoStartRef.current = true;
    startPayment();
  }, [autoStart, canPay, kkiapayReady, startPayment, status]);

  return (
    <>
      <div className="mt-3 rounded-3xl border border-[#059669]/20 bg-[#ECFDF5] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#059669]">Paiement en ligne</p>
            <p className="mt-1 text-sm font-black text-slate-950">Kkiapay</p>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-[#059669]">
            {sandboxMode === true ? 'Mode test' : sandboxMode === false ? 'Mode reel' : 'Pret'}
          </span>
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-slate-700">
          Cliquez sur le bouton ci-dessous pour ouvrir la fenetre Kkiapay. La commande reste en attente tant que le
          paiement n&apos;est pas confirme.
        </p>
        <button
          type="button"
          onClick={startPayment}
          disabled={!canPay || paymentLocked}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition enabled:hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {status === 'starting'
            ? 'Preparation...'
            : status === 'verifying'
              ? 'Verification...'
              : status === 'succeeded'
                ? 'Paiement confirme'
                : status === 'opened'
                  ? 'Paiement ouvert'
                  : status === 'blocked'
                    ? 'Controle AfricaPhone requis'
                : 'Payer maintenant par Kkiapay'}
        </button>
        {message ? (
          <p
            className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold leading-5 ${
              status === 'failed' ? 'bg-orange-50 text-orange-700' : 'bg-white text-slate-600'
            }`}
          >
            {message}
          </p>
        ) : null}
        {!canPay ? (
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Compte client complet et commande creee requis avant paiement.
          </p>
        ) : null}
      </div>

      {postPaymentModal ? (
        <PostPaymentModal
          state={postPaymentModal}
          onClose={() => setPostPaymentModal(null)}
        />
      ) : null}
    </>
  );
}

function PostPaymentModal({ state, onClose }: { state: PostPaymentModalState; onClose: () => void }) {
  const isSuccess = state.kind === 'success';
  const isAttention = state.kind === 'attention';
  const [receiptState, setReceiptState] = useState<{ busy: boolean; message: string }>({
    busy: false,
    message: '',
  });

  const handleReceiptDownload = async () => {
    if (!state.orderId || receiptState.busy) {
      return;
    }

    setReceiptState({ busy: true, message: '' });

    try {
      await downloadPaymentReceipt({ orderId: state.orderId });
      setReceiptState({ busy: false, message: 'Recu telecharge.' });
    } catch (error) {
      setReceiptState({
        busy: false,
        message: error instanceof Error ? error.message : 'Telechargement du recu impossible.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-payment-title"
      className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-950/25">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white ${
            isSuccess ? 'bg-[#059669]' : 'bg-[#F97316]'
          }`}
        >
          {isSuccess ? 'OK' : '!'}
        </div>
        <p className="mt-4 text-xs font-extrabold uppercase text-[#059669]">
          {isSuccess ? 'Paiement valide' : isAttention ? 'Controle requis' : 'Validation sur telephone'}
        </p>
        <h3 id="post-payment-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {state.title}
        </h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{state.body}</p>
        {state.transactionId ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            Transaction Kkiapay : {state.transactionId}
          </p>
        ) : null}
        {isSuccess && state.orderId ? (
          <button
            type="button"
            onClick={handleReceiptDownload}
            disabled={receiptState.busy}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#059669] text-sm font-extrabold text-white transition enabled:hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {receiptState.busy ? 'Preparation du recu...' : 'Telecharger le recu'}
          </button>
        ) : null}
        {receiptState.message ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            {receiptState.message}
          </p>
        ) : null}
        {isSuccess ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 items-center justify-center rounded-2xl bg-[#059669] text-sm font-extrabold text-white transition hover:bg-[#047857]"
            >
              Retour dans l&apos;application
            </button>
            <Link
              href="/commandes"
              className="flex h-12 items-center justify-center rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] text-sm font-extrabold text-[#059669]"
            >
              Voir mes commandes
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 items-center justify-center rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition hover:bg-[#EA580C]"
            >
              J&apos;ai compris
            </button>
            <Link
              href="/commandes"
              className="flex h-12 items-center justify-center rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] text-sm font-extrabold text-[#059669]"
            >
              Suivre ma demande
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-600"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
