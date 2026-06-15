'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  type CheckoutDraft,
  FULFILLMENT_MODE_LABELS,
  getCheckoutDraft,
  getCheckoutHistory,
  NEXT_STEP_MESSAGES,
  PAYMENT_MODE_LABELS,
} from '@/lib/checkoutDraft';
import { formatPrice } from '@/utils/formatPrice';

type OrderStatusView = {
  label: string;
  detail: string;
  className: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return 'Date inconnue';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getStatusView = (draft: CheckoutDraft): OrderStatusView => {
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
      detail: draft.orderSync.error || 'La demande est sauvegardee localement, mais la synchronisation doit etre reprise.',
      className: 'bg-rose-50 text-rose-700',
    };
  }

  return {
    label: 'Brouillon',
    detail: 'La demande est locale et doit etre finalisee dans le checkout.',
    className: 'bg-slate-100 text-slate-600',
  };
};

const getUniqueOrders = (orders: CheckoutDraft[]) => {
  const seen = new Set<string>();
  return orders.filter(order => {
    if (seen.has(order.id)) {
      return false;
    }
    seen.add(order.id);
    return true;
  });
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<CheckoutDraft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const latestDraft = getCheckoutDraft();
    const history = getCheckoutHistory();
    setOrders(getUniqueOrders(latestDraft ? [latestDraft, ...history] : history));
    setLoaded(true);
  }, []);

  const stats = useMemo(() => {
    const created = orders.filter(order => order.orderSync.status === 'created').length;
    const failed = orders.filter(order => order.orderSync.status === 'failed').length;
    const total = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    return { created, failed, total };
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Commandes"
          title="Mes demandes"
          description="Retrouvez vos demandes lancees depuis ce telephone, avec la prochaine action attendue par AfricaPhone."
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Demandes" value={orders.length.toString()} />
          <StatCard label="Envoyees" value={stats.created.toString()} tone="green" />
          <StatCard label="Total indicatif" value={formatPrice(stats.total)} tone="orange" />
        </section>

        {!loaded ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-500">Chargement des demandes...</p>
          </section>
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="space-y-3">
              {orders.map(order => (
                <OrderCard key={order.id} order={order} />
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
                    Reprendre checkout
                  </Link>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">A surveiller</p>
                <div className="mt-4 space-y-3">
                  <SmallStatus label="Commandes creees" value={`${stats.created} demande(s)`} />
                  <SmallStatus label="A verifier" value={`${stats.failed} synchronisation(s)`} warning={stats.failed > 0} />
                  <SmallStatus label="Paiement" value="Kkiapay non lance pour l instant" />
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

function OrderCard({ order }: { order: CheckoutDraft }) {
  const status = getStatusView(order);
  const visibleItems = order.items.slice(0, 3);
  const hiddenCount = Math.max(0, order.items.length - visibleItems.length);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase text-[#059669]">{formatDate(order.createdAt)}</p>
          <h2 className="mt-1 break-all text-xl font-black tracking-tight text-slate-950">{order.id}</h2>
        </div>
        <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          {visibleItems.map(item => (
            <div key={`${order.id}-${item.id}`} className="rounded-2xl bg-slate-50 px-3 py-3">
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
          {hiddenCount > 0 ? (
            <p className="px-3 text-xs font-bold text-slate-500">+{hiddenCount} autre(s) article(s)</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <SummaryLine label="Paiement" value={PAYMENT_MODE_LABELS[order.paymentMode]} />
          <SummaryLine label="Reception" value={FULFILLMENT_MODE_LABELS[order.fulfillmentMode]} />
          <SummaryLine label="Articles" value={`${order.totalQty}`} />
          <SummaryLine label="Total" value={formatPrice(order.totalPrice)} strong />
          {order.fulfillmentMode === 'delivery' && order.deliveryLocation?.mapUrl ? (
            <a
              href={order.deliveryLocation.mapUrl}
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
        <p className="text-xs font-extrabold uppercase text-orange-700">Prochaine etape</p>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{status.detail}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{NEXT_STEP_MESSAGES[order.paymentMode]}</p>
      </div>
    </article>
  );
}

function EmptyOrders() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-xs font-extrabold uppercase text-[#059669]">Aucune demande</p>
      <h2 className="mt-2 text-2xl font-black">Pas encore de commande locale</h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        Choisissez un produit, passez par le checkout, puis la demande apparaitra ici automatiquement.
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
