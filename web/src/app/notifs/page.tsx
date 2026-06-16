'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { type CheckoutDraft, formatCheckoutReference, getCheckoutDraft, getCheckoutHistory } from '@/lib/checkoutDraft';
import { auth } from '@/lib/firebaseClient';
import type { CustomerOrderClientView, CustomerOrderStatus, CustomerPaymentStatus } from '@/types/customerOrders';

type OrdersApiResponse = {
  authenticated?: boolean;
  orders?: CustomerOrderClientView[];
  message?: string;
};

type NotificationTone = 'green' | 'orange' | 'rose' | 'slate';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  status: string;
  tone: NotificationTone;
  createdAt: string | null;
  actionHref: string;
  actionLabel: string;
  needsAction: boolean;
};

const REMOTE_STATUS_NOTIFICATIONS: Record<
  CustomerOrderStatus,
  Pick<NotificationItem, 'title' | 'message' | 'status' | 'tone' | 'actionHref' | 'actionLabel' | 'needsAction'>
> = {
  draft: {
    title: 'Commande a finaliser',
    message: 'Une demande existe mais doit encore etre completee.',
    status: 'Brouillon',
    tone: 'slate',
    actionHref: '/checkout',
    actionLabel: 'Reprendre',
    needsAction: true,
  },
  pending_review: {
    title: 'Commande en verification',
    message: 'AfricaPhone verifie le stock, le retrait ou la livraison.',
    status: 'Suivi',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Voir',
    needsAction: false,
  },
  profile_required: {
    title: 'Profil client requis',
    message: 'Completez le compte avant paiement, cotisation ou retrait par representant.',
    status: 'Action',
    tone: 'orange',
    actionHref: '/compte',
    actionLabel: 'Completer',
    needsAction: true,
  },
  payment_pending: {
    title: 'Paiement attendu',
    message: 'La commande attend une etape de paiement avant traitement.',
    status: 'Paiement',
    tone: 'orange',
    actionHref: '/commandes',
    actionLabel: 'Verifier',
    needsAction: true,
  },
  paid: {
    title: 'Paiement confirme',
    message: 'Le paiement est valide, AfricaPhone prepare la suite.',
    status: 'Confirme',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Suivre',
    needsAction: false,
  },
  ready_for_pickup: {
    title: 'Retrait disponible',
    message: 'La commande est prete pour le passage en boutique.',
    status: 'Retrait',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Details',
    needsAction: true,
  },
  out_for_delivery: {
    title: 'Livraison en cours',
    message: 'La commande est avec l equipe de livraison.',
    status: 'Livraison',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Suivre',
    needsAction: false,
  },
  delivered: {
    title: 'Commande livree',
    message: 'La commande est terminee.',
    status: 'Terminee',
    tone: 'slate',
    actionHref: '/commandes',
    actionLabel: 'Voir',
    needsAction: false,
  },
  cancelled: {
    title: 'Commande annulee',
    message: 'Cette demande ne sera pas traitee.',
    status: 'Annulee',
    tone: 'rose',
    actionHref: '/commandes',
    actionLabel: 'Voir',
    needsAction: false,
  },
};

const PAYMENT_STATUS_NOTIFICATIONS: Partial<
  Record<CustomerPaymentStatus, Pick<NotificationItem, 'title' | 'message' | 'status' | 'tone' | 'needsAction'>>
> = {
  provider_opened: {
    title: 'Paiement ouvert',
    message: 'Un paiement en ligne a ete initialise et doit etre finalise.',
    status: 'Paiement',
    tone: 'orange',
    needsAction: true,
  },
  succeeded: {
    title: 'Paiement recu',
    message: 'AfricaPhone a recu la confirmation du paiement.',
    status: 'Confirme',
    tone: 'green',
    needsAction: false,
  },
  failed: {
    title: 'Paiement echoue',
    message: 'Le paiement n a pas abouti. La commande doit etre verifiee.',
    status: 'A verifier',
    tone: 'rose',
    needsAction: true,
  },
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

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

const sortNotifications = (items: NotificationItem[]) =>
  [...items].sort((a, b) => {
    if (a.needsAction !== b.needsAction) {
      return a.needsAction ? -1 : 1;
    }

    return Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '');
  });

const buildRemoteNotifications = (orders: CustomerOrderClientView[]) =>
  orders.flatMap(order => {
    const reference = order.localDraftId || order.id;
    const referenceLabel = formatCheckoutReference(reference);
    const statusTemplate = REMOTE_STATUS_NOTIFICATIONS[order.status] ?? REMOTE_STATUS_NOTIFICATIONS.pending_review;
    const notifications: NotificationItem[] = [
      {
        id: `order-${order.id}-${order.status}`,
        title: statusTemplate.title,
        message: `${statusTemplate.message} ${referenceLabel}.`,
        status: statusTemplate.status,
        tone: statusTemplate.tone,
        createdAt: order.updatedAt || order.createdAt,
        actionHref: statusTemplate.actionHref,
        actionLabel: statusTemplate.actionLabel,
        needsAction: statusTemplate.needsAction,
      },
    ];

    const paymentTemplate = PAYMENT_STATUS_NOTIFICATIONS[order.paymentStatus];
    if (paymentTemplate) {
      notifications.push({
        id: `payment-${order.id}-${order.paymentStatus}`,
        title: paymentTemplate.title,
        message: `${paymentTemplate.message} ${referenceLabel}.`,
        status: paymentTemplate.status,
        tone: paymentTemplate.tone,
        createdAt: order.updatedAt || order.createdAt,
        actionHref: '/commandes',
        actionLabel: 'Suivre',
        needsAction: paymentTemplate.needsAction,
      });
    }

    return notifications;
  });

const buildLocalNotifications = (orders: CheckoutDraft[], remoteOrders: CustomerOrderClientView[]) => {
  const remoteOrderIds = new Set(remoteOrders.map(order => order.id));
  const remoteLocalDraftIds = new Set(uniqueStrings(remoteOrders.map(order => order.localDraftId)));

  return orders
    .filter(order => !order.orderSync.orderId || !remoteOrderIds.has(order.orderSync.orderId))
    .filter(order => !remoteLocalDraftIds.has(order.id))
    .map((order): NotificationItem => {
      const referenceLabel = formatCheckoutReference(order.id);

      if (order.orderSync.status === 'failed') {
        return {
          id: `local-failed-${order.id}`,
          title: 'Commande a reprendre',
          message: `${referenceLabel} doit etre renvoyee.`,
          status: 'A verifier',
          tone: 'rose',
          createdAt: order.createdAt,
          actionHref: '/checkout',
          actionLabel: 'Reprendre',
          needsAction: true,
        };
      }

      if (order.orderSync.status === 'created') {
        return {
          id: `local-created-${order.id}`,
          title: order.orderSync.profileRequired ? 'Profil client requis' : 'Commande envoyee',
          message: order.orderSync.profileRequired
            ? `Completez le compte pour continuer ${referenceLabel}.`
            : `AfricaPhone traite ${referenceLabel}.`,
          status: order.orderSync.profileRequired ? 'Action' : 'Suivi',
          tone: order.orderSync.profileRequired ? 'orange' : 'green',
          createdAt: order.orderSync.createdAt || order.createdAt,
          actionHref: order.orderSync.profileRequired ? '/compte' : '/commandes',
          actionLabel: order.orderSync.profileRequired ? 'Completer' : 'Voir',
          needsAction: order.orderSync.profileRequired,
        };
      }

      return {
        id: `local-draft-${order.id}`,
        title: 'Demande non finalisee',
        message: `${referenceLabel} reste a terminer avant envoi.`,
        status: 'Brouillon',
        tone: 'slate',
        createdAt: order.createdAt,
        actionHref: '/checkout',
        actionLabel: 'Finaliser',
        needsAction: true,
      };
    });
};

export default function NotificationsPage() {
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
          throw new Error(body?.message || 'Chargement des alertes indisponible.');
        }

        if (!cancelled) {
          setRemoteOrders(Array.isArray(body?.orders) ? body.orders : []);
          setIsAuthenticated(body?.authenticated === true);
        }
      } catch {
        if (!cancelled) {
          setRemoteOrders([]);
          setRemoteError('Alertes indisponibles pour le moment.');
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

  const notifications = useMemo(
    () => sortNotifications([...buildRemoteNotifications(remoteOrders), ...buildLocalNotifications(localOrders, remoteOrders)]),
    [localOrders, remoteOrders]
  );
  const stats = useMemo(() => {
    const actionCount = notifications.filter(item => item.needsAction).length;
    const deliveryCount = notifications.filter(item => item.status === 'Livraison').length;

    return { actionCount, deliveryCount };
  }, [notifications]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Notifications"
          title="Alertes client"
          description="Priorites issues de vos commandes et demandes en cours."
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Alertes" value={notifications.length.toString()} />
          <StatCard label="A traiter" value={stats.actionCount.toString()} tone="orange" />
          <StatCard label="Livraison" value={stats.deliveryCount.toString()} tone="green" />
        </section>

        {!loaded ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-bold text-slate-500">Chargement des alertes...</p>
          </section>
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="space-y-3">
              {notifications.map(notification => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Suivi</p>
                <div className="mt-4 space-y-3">
                  <SmallStatus
                    label="Compte client"
                    value={isAuthenticated ? 'Connecte' : 'A connecter'}
                  />
                  <SmallStatus
                    label="Commandes"
                    value={remoteError || `${remoteOrders.length} demande(s) suivie(s)`}
                    warning={Boolean(remoteError)}
                  />
                  <SmallStatus label="Actions" value={`${stats.actionCount} priorite(s)`} warning={stats.actionCount > 0} />
                </div>
              </section>

              <section className="rounded-3xl border border-[#059669]/15 bg-[#ECFDF5] p-4">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Acces rapides</p>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/commandes"
                    className="flex h-11 items-center justify-center rounded-2xl bg-[#059669] text-sm font-extrabold text-white"
                  >
                    Commandes
                  </Link>
                  <Link
                    href="/compte"
                    className="flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-[#059669]"
                  >
                    Compte
                  </Link>
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

function NotificationCard({ notification }: { notification: NotificationItem }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dotClass(notification.tone)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase text-slate-500">{formatDate(notification.createdAt)}</p>
              <h2 className="mt-1 text-base font-black text-slate-950">{notification.title}</h2>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${pillClass(notification.tone)}`}>
              {notification.status}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{notification.message}</p>
          <Link
            href={notification.actionHref}
            className="mt-3 inline-flex rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white"
          >
            {notification.actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyNotifications() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-xs font-extrabold uppercase text-[#059669]">Aucune alerte</p>
      <h2 className="mt-2 text-2xl font-black">Rien a traiter maintenant</h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        Les alertes apparaitront apres une demande de commande, un paiement ou une livraison.
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

function SmallStatus({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ${warning ? 'bg-rose-50' : 'bg-slate-50'}`}>
      <p className={`text-sm font-black ${warning ? 'text-rose-700' : 'text-slate-950'}`}>{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{value}</p>
    </div>
  );
}

function dotClass(tone: NotificationTone) {
  if (tone === 'orange') {
    return 'bg-[#F97316]';
  }
  if (tone === 'rose') {
    return 'bg-rose-500';
  }
  if (tone === 'slate') {
    return 'bg-slate-400';
  }
  return 'bg-[#059669]';
}

function pillClass(tone: NotificationTone) {
  if (tone === 'orange') {
    return 'bg-orange-50 text-[#F97316]';
  }
  if (tone === 'rose') {
    return 'bg-rose-50 text-rose-700';
  }
  if (tone === 'slate') {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-[#ECFDF5] text-[#059669]';
}
