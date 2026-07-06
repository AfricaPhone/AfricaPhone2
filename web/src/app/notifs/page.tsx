'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { auth } from '@/lib/firebaseClient';
import type { CustomerNotification, CustomerNotificationType } from '@/types/customerOrders';

type CustomerNotificationClient = Omit<CustomerNotification, 'createdAt'> & {
  createdAt: string | null;
};

type NotificationsApiResponse = {
  authenticated?: boolean;
  notifications?: CustomerNotificationClient[];
  unreadCount?: number;
  message?: string;
};

type NotificationTone = 'green' | 'orange' | 'rose' | 'slate';

type NotificationItem = {
  id: string;
  notificationId?: string;
  title: string;
  message: string;
  status: string;
  tone: NotificationTone;
  createdAt: string | null;
  actionHref: string;
  actionLabel: string;
  needsAction: boolean;
  read?: boolean;
};

type NotificationTemplate = Pick<
  NotificationItem,
  'title' | 'message' | 'status' | 'tone' | 'actionHref' | 'actionLabel' | 'needsAction'
>;

const SERVER_NOTIFICATION_UI: Record<CustomerNotificationType, Omit<NotificationTemplate, 'title' | 'message'>> = {
  order_created: {
    status: 'Commande',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Voir',
    needsAction: false,
  },
  profile_required: {
    status: 'Profil',
    tone: 'orange',
    actionHref: '/compte',
    actionLabel: 'Completer',
    needsAction: true,
  },
  payment_required: {
    status: 'Paiement',
    tone: 'orange',
    actionHref: '/commandes',
    actionLabel: 'Payer',
    needsAction: true,
  },
  payment_succeeded: {
    status: 'Paye',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Voir',
    needsAction: false,
  },
  payment_failed: {
    status: 'A verifier',
    tone: 'rose',
    actionHref: '/commandes',
    actionLabel: 'Verifier',
    needsAction: true,
  },
  documents_required: {
    status: 'Document',
    tone: 'orange',
    actionHref: '/compte',
    actionLabel: 'Compte',
    needsAction: true,
  },
  contract_review: {
    status: 'Contrat',
    tone: 'orange',
    actionHref: '/compte',
    actionLabel: 'Voir',
    needsAction: true,
  },
  ready_for_pickup: {
    status: 'Retrait',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Details',
    needsAction: true,
  },
  delivery_update: {
    status: 'Livraison',
    tone: 'green',
    actionHref: '/commandes',
    actionLabel: 'Suivre',
    needsAction: false,
  },
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

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

const isUnread = (item: NotificationItem) => item.read === false;

const sortNotifications = (items: NotificationItem[]) =>
  [...items].sort((a, b) => {
    const aUnread = isUnread(a);
    const bUnread = isUnread(b);

    if (aUnread !== bUnread) {
      return aUnread ? -1 : 1;
    }

    if (a.needsAction !== b.needsAction) {
      return a.needsAction ? -1 : 1;
    }

    return Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '');
  });

const resolveServerTemplate = (notification: CustomerNotificationClient) => {
  const template = SERVER_NOTIFICATION_UI[notification.type] ?? SERVER_NOTIFICATION_UI.order_created;
  const text = normalizeText(`${notification.title} ${notification.message}`);
  const isPositiveReview =
    (notification.type === 'contract_review' || notification.type === 'documents_required') &&
    (text.includes('valide') || text.includes('approuve'));

  if (!isPositiveReview) {
    return template;
  }

  return {
    ...template,
    tone: 'green' as const,
    needsAction: false,
  };
};

const buildServerNotification = (notification: CustomerNotificationClient): NotificationItem => {
  const template = resolveServerTemplate(notification);

  return {
    id: `server-${notification.id}`,
    notificationId: notification.id,
    title: notification.title,
    message: notification.message,
    status: notification.read ? 'Lu' : template.status,
    tone: notification.read ? 'slate' : template.tone,
    createdAt: notification.createdAt,
    actionHref: template.actionHref,
    actionLabel: template.actionLabel,
    needsAction: template.needsAction,
    read: notification.read,
  };
};

const fetchCustomerNotifications = async (idToken: string | null) => {
  if (!idToken) {
    return { notifications: [] as CustomerNotificationClient[], unreadCount: 0 };
  }

  const response = await fetch('/api/notifications', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = (await response.json().catch(() => null)) as NotificationsApiResponse | null;

  if (!response.ok) {
    throw new Error(body?.message || 'Chargement des notifications indisponible.');
  }

  return {
    unreadCount: typeof body?.unreadCount === 'number' ? body.unreadCount : 0,
    notifications: Array.isArray(body?.notifications) ? body.notifications : [],
  };
};

export default function NotificationsPage() {
  const [serverNotifications, setServerNotifications] = useState<CustomerNotificationClient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [markingId, setMarkingId] = useState('');

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setLoaded(false);
      setNotificationsError('');
      setIsAuthenticated(Boolean(user));

      try {
        const idToken = user ? await user.getIdToken() : null;
        const notificationsResult = await fetchCustomerNotifications(idToken);

        if (cancelled) {
          return;
        }

        setServerNotifications(notificationsResult.notifications);
      } catch {
        if (!cancelled) {
          setServerNotifications([]);
          setNotificationsError('Notifications indisponibles pour le moment.');
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

  const markNotificationRead = async (notificationId: string) => {
    const user = auth.currentUser;
    if (!user) {
      setNotificationsError('Connectez-vous pour mettre a jour les notifications.');
      return;
    }

    setMarkingId(notificationId);
    setNotificationsError('');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId, read: true }),
      });
      const body = (await response.json().catch(() => null)) as {
        notification?: CustomerNotificationClient;
        message?: string;
      } | null;

      if (!response.ok || !body?.notification) {
        throw new Error(body?.message || 'Mise a jour impossible.');
      }

      setServerNotifications(current =>
        current.map(notification => (notification.id === body.notification?.id ? body.notification : notification))
      );
      window.dispatchEvent(new Event('africaphone:notifications-updated'));
    } catch {
      setNotificationsError('Impossible de marquer la notification comme lue.');
    } finally {
      setMarkingId('');
    }
  };

  const notifications = useMemo(() => {
    return sortNotifications(serverNotifications.map(buildServerNotification));
  }, [serverNotifications]);
  const stats = useMemo(() => {
    const unreadCount = serverNotifications.filter(item => item.read !== true).length;
    const actionCount = notifications.filter(item => item.needsAction).length;
    const deliveryCount = notifications.filter(item => item.status === 'Livraison').length;

    return { unreadCount, actionCount, deliveryCount };
  }, [notifications, serverNotifications]);
  const accountStatus = isAuthenticated ? 'Connecte' : 'A connecter';
  const statusMessage = notificationsError || `${serverNotifications.length} notification(s)`;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader eyebrow="Notifications" title="Alertes client" />

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Non lues" value={stats.unreadCount.toString()} tone={stats.unreadCount > 0 ? 'orange' : 'slate'} />
          <StatCard label="A traiter" value={stats.actionCount.toString()} tone={stats.actionCount > 0 ? 'orange' : 'slate'} />
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
                <NotificationCard
                  key={notification.id}
                  marking={markingId === notification.notificationId}
                  notification={notification}
                  onMarkRead={notification.notificationId ? markNotificationRead : undefined}
                />
              ))}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Suivi</p>
                <div className="mt-4 space-y-3">
                  <SmallStatus label="Compte client" value={accountStatus} warning={!isAuthenticated} />
                  <SmallStatus label="Etat" value={statusMessage} warning={Boolean(notificationsError)} />
                  <SmallStatus
                    label="Notifications"
                    value={`${stats.unreadCount} non lue(s)`}
                    warning={stats.unreadCount > 0}
                  />
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

function NotificationCard({
  notification,
  onMarkRead,
  marking,
}: {
  notification: NotificationItem;
  onMarkRead?: (notificationId: string) => void;
  marking: boolean;
}) {
  const unread = isUnread(notification);

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
            <div className="flex flex-wrap gap-2">
              {unread ? (
                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-[#F97316]">
                  Non lue
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${pillClass(notification.tone)}`}>
                {notification.status}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{notification.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={notification.actionHref} className="inline-flex rounded-full bg-[#059669] px-4 py-2 text-xs font-extrabold text-white">
              {notification.actionLabel}
            </Link>
            {unread && notification.notificationId && onMarkRead ? (
              <button
                type="button"
                disabled={marking}
                onClick={() => onMarkRead(notification.notificationId as string)}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 transition hover:border-[#059669]/40 hover:text-[#059669] disabled:cursor-wait disabled:opacity-60"
              >
                {marking ? 'Mise a jour...' : 'Marquer lue'}
              </button>
            ) : null}
          </div>
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
        Les notifications apparaitront apres une commande, un paiement, un document valide ou une livraison.
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
