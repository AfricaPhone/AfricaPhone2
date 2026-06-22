'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { auth } from '@/lib/firebaseClient';
import {
  type CheckoutDraft,
  FULFILLMENT_MODE_LABELS,
  formatCheckoutReference,
  getCheckoutDraft,
  getCheckoutHistory,
  PAYMENT_MODE_LABELS,
} from '@/lib/checkoutDraft';
import type {
  CustomerFulfillmentMode,
  CustomerOrderClientView,
  CustomerOrderStatus,
  CustomerPaymentMode,
  CustomerPaymentStatus,
} from '@/types/customerOrders';
import { formatPrice } from '@/utils/formatPrice';

type OrderStatusView = {
  label: string;
  detail: string;
  className: string;
};

type DisplayOrderItem = {
  id: string;
  name: string;
  quantity: number;
  subtotal: number | null;
};

type DisplayOrder = {
  key: string;
  source: 'remote' | 'local';
  reference: string;
  createdAt: string | null;
  status: OrderStatusView;
  items: DisplayOrderItem[];
  paymentLabel: string;
  paymentStatusLabel: string | null;
  fulfillmentLabel: string;
  totalQty: number;
  totalPrice: number;
  deliveryMapUrl: string | null;
};

type OrdersApiResponse = {
  authenticated?: boolean;
  orders?: CustomerOrderClientView[];
  message?: string;
};

const REMOTE_PAYMENT_MODE_LABELS: Record<CustomerPaymentMode, string> = {
  pay_on_delivery: 'Payer a la livraison',
  kkiapay_now: 'Payer en ligne maintenant',
  shop_confirmation: 'Confirmer en boutique',
  installment_plan: 'Acheter par cotisation',
};

const REMOTE_FULFILLMENT_LABELS: Record<CustomerFulfillmentMode, string> = {
  delivery: 'Livraison',
  shop_pickup: 'Retrait client en boutique',
  representative_pickup: 'Retrait par representant',
};

const PAYMENT_STATUS_LABELS: Record<CustomerPaymentStatus, string> = {
  not_required: 'Non requis',
  pending: 'En attente',
  provider_opened: 'Paiement ouvert',
  succeeded: 'Paiement confirme',
  failed: 'Echec paiement',
  cancelled: 'Paiement annule',
  refunded: 'Rembourse',
};

const REMOTE_STATUS_VIEWS: Record<CustomerOrderStatus, OrderStatusView> = {
  draft: {
    label: 'Brouillon',
    detail: 'La demande doit encore etre finalisee.',
    className: 'bg-slate-100 text-slate-600',
  },
  pending_review: {
    label: 'En verification',
    detail: 'AfricaPhone verifie le stock, la livraison ou le retrait.',
    className: 'bg-[#ECFDF5] text-[#059669]',
  },
  profile_required: {
    label: 'Profil requis',
    detail: 'Un compte client complet est requis avant paiement, cotisation ou retrait par representant.',
    className: 'bg-orange-50 text-orange-700',
  },
  payment_pending: {
    label: 'Paiement attendu',
    detail: 'Le paiement doit etre finalise avant la suite du traitement.',
    className: 'bg-orange-50 text-orange-700',
  },
  paid: {
    label: 'Paiement confirme',
    detail: 'Le paiement est confirme, AfricaPhone prepare la suite.',
    className: 'bg-[#ECFDF5] text-[#059669]',
  },
  ready_for_pickup: {
    label: 'Pret au retrait',
    detail: 'La commande est prete pour le passage en boutique.',
    className: 'bg-[#ECFDF5] text-[#059669]',
  },
  out_for_delivery: {
    label: 'En livraison',
    detail: 'La commande est avec l equipe de livraison.',
    className: 'bg-[#ECFDF5] text-[#059669]',
  },
  delivered: {
    label: 'Livree',
    detail: 'La commande est terminee.',
    className: 'bg-slate-100 text-slate-600',
  },
  cancelled: {
    label: 'Annulee',
    detail: 'Cette commande a ete annulee.',
    className: 'bg-rose-50 text-rose-700',
  },
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Date inconnue';
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return 'Date inconnue';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getLocalStatusView = (draft: CheckoutDraft): OrderStatusView => {
  if (draft.orderSync.status === 'created') {
    if (draft.orderSync.profileRequired) {
      return {
        label: 'Profil requis',
        detail: 'La demande existe, mais un compte client reste necessaire avant paiement ou cotisation.',
        className: 'bg-orange-50 text-orange-700',
      };
    }

    return {
      label: 'Commande recue',
      detail: 'AfricaPhone doit confirmer disponibilite, livraison ou retrait.',
      className: 'bg-[#ECFDF5] text-[#059669]',
    };
  }

  if (draft.orderSync.status === 'failed') {
    return {
      label: 'A verifier',
      detail: 'La demande n a pas pu etre transmise. Reprenez le parcours pour la renvoyer.',
      className: 'bg-rose-50 text-rose-700',
    };
  }

  return {
    label: 'Brouillon',
    detail: 'La demande doit etre finalisee avant envoi a AfricaPhone.',
    className: 'bg-slate-100 text-slate-600',
  };
};

const getUniqueLocalOrders = (orders: CheckoutDraft[]) => {
  const seen = new Set<string>();
  return orders.filter(order => {
    if (seen.has(order.id)) {
      return false;
    }
    seen.add(order.id);
    return true;
  });
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const buildOrdersUrl = (localOrders: CheckoutDraft[]) => {
  const params = new URLSearchParams();
  const orderIds = uniqueStrings(localOrders.map(order => order.orderSync.orderId));
  const localDraftIds = uniqueStrings(localOrders.map(order => order.id));

  if (orderIds.length > 0) {
    params.set('orderIds', orderIds.join(','));
  }

  if (localDraftIds.length > 0) {
    params.set('localDraftIds', localDraftIds.join(','));
  }

  const query = params.toString();
  return query ? `/api/orders?${query}` : '/api/orders';
};

const mapRemoteOrder = (order: CustomerOrderClientView): DisplayOrder => {
  const items = order.items.map(item => ({
    id: item.productId,
    name: item.name,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    key: `remote-${order.id}`,
    source: 'remote',
    reference: order.localDraftId || order.id,
    createdAt: order.createdAt,
    status: REMOTE_STATUS_VIEWS[order.status] ?? REMOTE_STATUS_VIEWS.pending_review,
    items,
    paymentLabel: REMOTE_PAYMENT_MODE_LABELS[order.paymentMode] ?? order.paymentMode,
    paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
    fulfillmentLabel: REMOTE_FULFILLMENT_LABELS[order.fulfillmentMode] ?? order.fulfillmentMode,
    totalQty,
    totalPrice: order.totals.totalDue ?? order.totals.itemsSubtotal ?? 0,
    deliveryMapUrl: order.delivery.location?.mapUrl ?? null,
  };
};

const mapLocalOrder = (order: CheckoutDraft): DisplayOrder => ({
  key: `local-${order.id}`,
  source: 'local',
  reference: order.id,
  createdAt: order.createdAt,
  status: getLocalStatusView(order),
  items: order.items.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.qty,
    subtotal: typeof item.price === 'number' ? item.price * item.qty : null,
  })),
  paymentLabel: PAYMENT_MODE_LABELS[order.paymentMode],
  paymentStatusLabel: null,
  fulfillmentLabel: FULFILLMENT_MODE_LABELS[order.fulfillmentMode],
  totalQty: order.totalQty,
  totalPrice: order.totalPrice,
  deliveryMapUrl: order.fulfillmentMode === 'delivery' ? order.deliveryLocation?.mapUrl ?? null : null,
});

const mergeOrders = (remoteOrders: CustomerOrderClientView[], localOrders: CheckoutDraft[]) => {
  const remoteOrderIds = new Set(remoteOrders.map(order => order.id));
  const remoteLocalDraftIds = new Set(uniqueStrings(remoteOrders.map(order => order.localDraftId)));
  const remoteDisplayOrders = remoteOrders.map(mapRemoteOrder);
  const localDisplayOrders = localOrders
    .filter(order => !order.orderSync.orderId || !remoteOrderIds.has(order.orderSync.orderId))
    .filter(order => !remoteLocalDraftIds.has(order.id))
    .map(mapLocalOrder);

  return [...remoteDisplayOrders, ...localDisplayOrders].sort(
    (a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '')
  );
};

export default function OrdersPage() {
  const [localOrders, setLocalOrders] = useState<CheckoutDraft[]>([]);
  const [remoteOrders, setRemoteOrders] = useState<CustomerOrderClientView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const latestDraft = getCheckoutDraft();
    const history = getCheckoutHistory();
    const nextLocalOrders = getUniqueLocalOrders(latestDraft ? [latestDraft, ...history] : history);
    let cancelled = false;

    setLocalOrders(nextLocalOrders);

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setLoaded(false);
      setRemoteError('');

      try {
        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch(buildOrdersUrl(nextLocalOrders), {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        });
        const body = (await response.json().catch(() => null)) as OrdersApiResponse | null;

        if (!response.ok) {
          throw new Error(body?.message || 'Chargement des commandes indisponible.');
        }

        if (!cancelled) {
          setRemoteOrders(Array.isArray(body?.orders) ? body.orders : []);
          setIsAuthenticated(body?.authenticated === true);
        }
      } catch {
        if (!cancelled) {
          setRemoteOrders([]);
          setRemoteError('Suivi indisponible pour le moment.');
          setIsAuthenticated(Boolean(user));
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const orders = useMemo(() => mergeOrders(remoteOrders, localOrders), [localOrders, remoteOrders]);

  const stats = useMemo(() => {
    const synced = orders.filter(order => order.source === 'remote').length;
    const total = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const needsAction = orders.filter(order =>
      ['Profil requis', 'Paiement attendu', 'A verifier', 'Brouillon'].includes(order.status.label)
    ).length;

    return { synced, needsAction, total };
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Commandes"
          title="Mes demandes"
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Demandes" value={orders.length.toString()} />
          <StatCard label="Chez AfricaPhone" value={stats.synced.toString()} tone="green" />
          <StatCard label="Total indicatif" value={formatPrice(stats.total)} tone="orange" />
        </section>

        {!loaded ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-500">Chargement des commandes...</p>
          </section>
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="space-y-3">
              {orders.map(order => (
                <OrderCard key={order.key} order={order} />
              ))}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Actions</p>
                <div className="mt-4 grid gap-3">
                  <Link
                    href="/"
                    className="flex h-11 items-center justify-center rounded-2xl bg-[#059669] text-sm font-extrabold text-white"
                  >
                    Nouvelle selection
                  </Link>
                  <Link
                    href="/checkout"
                    className="flex h-11 items-center justify-center rounded-2xl bg-[#F97316] text-sm font-extrabold text-white"
                  >
                    Finaliser une demande
                  </Link>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Suivi</p>
                <div className="mt-4 space-y-3">
                  <SmallStatus
                    label="Compte client"
                    value={isAuthenticated ? 'Connecte' : 'A connecter'}
                  />
                  <SmallStatus label="A traiter" value={`${stats.needsAction} demande(s)`} warning={stats.needsAction > 0} />
                  <SmallStatus
                    label="Commandes"
                    value={remoteError || `${stats.synced} demande(s) suivie(s) par AfricaPhone`}
                    warning={Boolean(remoteError)}
                  />
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}

function OrderCard({ order }: { order: DisplayOrder }) {
  const visibleItems = order.items.slice(0, 3);
  const hiddenCount = Math.max(0, order.items.length - visibleItems.length);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase text-[#059669]">{formatDate(order.createdAt)}</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {formatCheckoutReference(order.reference)}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${order.status.className}`}>
          {order.status.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          {visibleItems.map(item => (
            <div key={`${order.key}-${item.id}`} className="rounded-2xl bg-slate-50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-extrabold text-slate-950">{item.name}</p>
                  <p className="text-xs font-semibold text-slate-500">Quantite : {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-[#059669]">{formatPrice(item.subtotal)}</p>
              </div>
            </div>
          ))}
          {hiddenCount > 0 ? (
            <p className="px-3 text-xs font-bold text-slate-500">+{hiddenCount} autre(s) article(s)</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <SummaryLine label="Paiement" value={order.paymentLabel} />
          {order.paymentStatusLabel ? <SummaryLine label="Etat paiement" value={order.paymentStatusLabel} /> : null}
          <SummaryLine label="Reception" value={order.fulfillmentLabel} />
          <SummaryLine label="Articles" value={`${order.totalQty}`} />
          <SummaryLine label="Total" value={formatPrice(order.totalPrice)} strong />
          {order.deliveryMapUrl ? (
            <a
              href={order.deliveryMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-10 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#059669]"
            >
              Position livraison
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-orange-50 px-3 py-3">
        <p className="text-xs font-extrabold uppercase text-orange-700">Etat</p>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{order.status.detail}</p>
      </div>
    </article>
  );
}

function EmptyOrders() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-xs font-extrabold uppercase text-[#059669]">Aucune demande</p>
      <h2 className="mt-2 text-2xl font-black">Pas encore de commande</h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        Choisissez un produit, finalisez la demande, puis elle apparaitra ici automatiquement.
      </p>
      <Link href="/" className="mt-5 rounded-full bg-[#059669] px-5 py-2.5 text-sm font-extrabold text-white">
        Voir le catalogue
      </Link>
    </section>
  );
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'orange' }) {
  const toneClass =
    tone === 'green'
      ? 'border-[#059669]/20 bg-[#ECFDF5] text-[#059669]'
      : tone === 'orange'
        ? 'border-orange-200 bg-orange-50 text-orange-700'
        : 'border-slate-200 bg-white text-slate-950';

  return (
    <article className={`rounded-3xl border p-4 shadow-sm shadow-slate-200/70 ${toneClass}`}>
      <p className="text-xs font-extrabold uppercase opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className={`text-right text-xs ${strong ? 'font-black text-[#059669]' : 'font-extrabold text-slate-950'}`}>
        {value}
      </span>
    </div>
  );
}

function SmallStatus({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ${warning ? 'bg-rose-50' : 'bg-slate-50'}`}>
      <p className={`text-sm font-black ${warning ? 'text-rose-700' : 'text-slate-950'}`}>{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{value}</p>
    </div>
  );
}
