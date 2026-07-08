'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import KkiapayInstructionModal from '@/components/KkiapayInstructionModal';
import MobileBottomNav from '@/components/MobileBottomNav';
import { PAYMENT_CONFIG } from '@/config/payment';
import { auth } from '@/lib/firebaseClient';
import { loadKkiapay, type KkiapayListenerData } from '@/lib/kkiapay';
import { downloadPaymentReceipt } from '@/lib/paymentReceipts';
import {
  type CheckoutDraft,
  clearCheckoutDrafts,
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
  orderId: string | null;
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
  receiptAvailable: boolean;
};

type OrdersApiResponse = {
  authenticated?: boolean;
  orders?: CustomerOrderClientView[];
  message?: string;
};

type InstallmentPlanView = {
  id: string;
  orderId: string;
  orderReference: string | null;
  status: 'draft' | 'documents_required' | 'contract_review' | 'active' | 'late' | 'completed' | 'cancelled';
  targetMode: 'selected_product' | 'open_phone_purchase';
  selectedProduct: {
    name: string;
    quantity: number;
    subtotal: number | null;
  } | null;
  productTotal: number;
  amountPaid: number;
  balanceRemaining: number;
  currency: 'XOF';
  paymentCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
  activatedAt: string | null;
  lastPaymentAt?: string | null;
};

type InstallmentPaymentView = {
  id: string;
  orderId: string;
  installmentPlanId: string | null;
  status: CustomerPaymentStatus;
  amount: number;
  currency: 'XOF';
  providerReference: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  receiptStatus: string;
  receiptError: string | null;
  createdAt: string | null;
  verifiedAt: string | null;
};

type InstallmentsApiResponse = {
  installments?: InstallmentPlanView[];
  payments?: InstallmentPaymentView[];
  message?: string;
};

type InitiateInstallmentPaymentResponse = {
  paymentId: string;
  installmentPlanId: string;
  providerReference: string;
  amount: number;
  currency: 'XOF';
  publicKey: string;
  sandbox: boolean;
  customer: {
    name: string;
    email: string | null;
    phone: string;
  };
  message?: string;
};

type VerifyInstallmentPaymentResponse = {
  payment?: {
    id: string;
    status: string;
    amount: number;
    providerTransactionId: string | null;
    receiptStatus: string;
  };
  message?: string;
};

type InstallmentPaymentModalState = {
  tone: 'pending' | 'success';
  eyebrow: string;
  title: string;
  body: string;
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

const INSTALLMENT_STATUS_LABELS: Record<InstallmentPlanView['status'], string> = {
  draft: 'Brouillon',
  documents_required: 'Documents requis',
  contract_review: 'Contrat en verification',
  active: 'Active',
  late: 'Retard',
  completed: 'Terminee',
  cancelled: 'Annulee',
};

const INSTALLMENT_STATUS_STYLES: Record<InstallmentPlanView['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  documents_required: 'bg-orange-50 text-orange-700',
  contract_review: 'bg-orange-50 text-orange-700',
  active: 'bg-[#ECFDF5] text-[#059669]',
  late: 'bg-rose-50 text-rose-700',
  completed: 'bg-[#ECFDF5] text-[#059669]',
  cancelled: 'bg-slate-100 text-slate-600',
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

const getKkiapayTransactionId = (data?: KkiapayListenerData) =>
  (data?.transactionId && String(data.transactionId)) || (data?.flwRef && String(data.flwRef)) || null;

const getInstallmentPendingMessage = () =>
  "Une demande de validation vient d'etre envoyee sur votre telephone. Ouvrez la notification operateur ou Mobile Money, saisissez votre code secret si demande, puis confirmez. Le versement sera ajoute a votre dossier uniquement apres confirmation Kkiapay.";

const getInstallmentSuccessMessage = () =>
  "Versement confirme. Il est ajoute a votre dossier de cotisation et le recu est disponible dans l'application. Continuez a suivre votre progression jusqu'au solde complet du telephone choisi.";

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
    orderId: order.id,
    reference: order.referenceCode || order.localDraftId || order.id,
    createdAt: order.createdAt,
    status: REMOTE_STATUS_VIEWS[order.status] ?? REMOTE_STATUS_VIEWS.pending_review,
    items,
    paymentLabel: REMOTE_PAYMENT_MODE_LABELS[order.paymentMode] ?? order.paymentMode,
    paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
    fulfillmentLabel: REMOTE_FULFILLMENT_LABELS[order.fulfillmentMode] ?? order.fulfillmentMode,
    totalQty,
    totalPrice: order.totals.totalDue ?? order.totals.itemsSubtotal ?? 0,
    deliveryMapUrl: order.delivery.location?.mapUrl ?? null,
    receiptAvailable: order.paymentMode === 'kkiapay_now' && order.paymentStatus === 'succeeded',
  };
};

const mapLocalOrder = (order: CheckoutDraft): DisplayOrder => ({
  key: `local-${order.id}`,
  source: 'local',
  orderId: null,
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
  receiptAvailable: false,
});

const mergeOrders = (remoteOrders: CustomerOrderClientView[], localOrders: CheckoutDraft[], remoteAuthoritative: boolean) => {
  const remoteOrderIds = new Set(remoteOrders.map(order => order.id));
  const remoteLocalDraftIds = new Set(uniqueStrings(remoteOrders.map(order => order.localDraftId)));
  const remoteDisplayOrders = remoteOrders.map(mapRemoteOrder);
  const localDisplayOrders = localOrders
    .filter(order => !(remoteAuthoritative && order.orderSync.status === 'created' && order.orderSync.orderId))
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
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanView[]>([]);
  const [installmentPayments, setInstallmentPayments] = useState<InstallmentPaymentView[]>([]);
  const [installmentAmounts, setInstallmentAmounts] = useState<Record<string, string>>({});
  const [installmentPaymentState, setInstallmentPaymentState] = useState<{
    status: 'idle' | 'starting' | 'opened' | 'verifying' | 'succeeded' | 'failed';
    planId: string | null;
    message: string;
  }>({ status: 'idle', planId: null, message: '' });
  const [installmentPaymentModal, setInstallmentPaymentModal] = useState<InstallmentPaymentModalState | null>(null);
  const pendingInstallmentPaymentRef = useRef<{ installmentPlanId: string; paymentId: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadInstallments = useCallback(async (idToken: string) => {
    const response = await fetch('/api/installments', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    const body = (await response.json().catch(() => null)) as InstallmentsApiResponse | null;

    if (!response.ok) {
      throw new Error(body?.message || 'Chargement des cotisations indisponible.');
    }

    setInstallmentPlans(Array.isArray(body?.installments) ? body.installments : []);
    setInstallmentPayments(Array.isArray(body?.payments) ? body.payments : []);
  }, []);

  const verifyInstallmentPayment = useCallback(
    async (data?: KkiapayListenerData) => {
      const pendingPayment = pendingInstallmentPaymentRef.current;
      const transactionId = getKkiapayTransactionId(data);

      if (!pendingPayment || !transactionId) {
        setInstallmentPaymentState({
          status: 'failed',
          planId: pendingPayment?.installmentPlanId || null,
          message: 'Reference Kkiapay manquante. Contactez AfricaPhone avec la capture du paiement.',
        });
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setInstallmentPaymentState({
          status: 'failed',
          planId: pendingPayment.installmentPlanId,
          message: 'Reconnectez votre compte client pour confirmer la cotisation.',
        });
        return;
      }

      setInstallmentPaymentState({
        status: 'verifying',
        planId: pendingPayment.installmentPlanId,
        message: 'Verification securisee de la cotisation...',
      });

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/installments/kkiapay/verify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            installmentPlanId: pendingPayment.installmentPlanId,
            paymentId: pendingPayment.paymentId,
            transactionId,
          }),
        });
        const body = (await response.json().catch(() => null)) as VerifyInstallmentPaymentResponse | null;

        if (!response.ok || body?.payment?.status !== 'succeeded') {
          throw new Error(body?.message || 'Cotisation non confirmee par le serveur.');
        }

        pendingInstallmentPaymentRef.current = null;
        await loadInstallments(token);
        setInstallmentPaymentState({
          status: 'succeeded',
          planId: pendingPayment.installmentPlanId,
          message: 'Cotisation confirmee. Le recu est disponible dans l application.',
        });
        setInstallmentPaymentModal({
          tone: 'success',
          eyebrow: 'Versement confirme',
          title: 'Cotisation enregistree',
          body: getInstallmentSuccessMessage(),
        });
      } catch (error) {
        setInstallmentPaymentState({
          status: 'failed',
          planId: pendingPayment.installmentPlanId,
          message: error instanceof Error ? error.message : 'Verification cotisation impossible.',
        });
      }
    },
    [loadInstallments]
  );

  const handleInstallmentPaymentFailed = useCallback(() => {
    setInstallmentPaymentState(prev => ({
      status: 'failed',
      planId: prev.planId,
      message: 'La cotisation Kkiapay n a pas abouti.',
    }));
  }, []);

  const handleInstallmentPaymentPending = useCallback(() => {
    const pendingPayment = pendingInstallmentPaymentRef.current;
    setInstallmentPaymentState({
      status: 'opened',
      planId: pendingPayment?.installmentPlanId || null,
      message: 'Validation demandee sur votre telephone. Confirmez avec votre code secret Mobile Money.',
    });
    setInstallmentPaymentModal({
      tone: 'pending',
      eyebrow: 'Validation sur telephone',
      title: 'Validez le versement',
      body: getInstallmentPendingMessage(),
    });
  }, []);

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

        if (idToken) {
          await loadInstallments(idToken);
        } else if (!cancelled) {
          setInstallmentPlans([]);
          setInstallmentPayments([]);
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
  }, [loadInstallments]);

  useEffect(() => {
    let disposed = false;
    let moduleInstance: Awaited<ReturnType<typeof loadKkiapay>> | null = null;

    loadKkiapay()
      .then(instance => {
        if (disposed) {
          return;
        }
        moduleInstance = instance;
        instance.addSuccessListener(verifyInstallmentPayment);
        instance.addFailedListener(handleInstallmentPaymentFailed);
        instance.addPendingListener(handleInstallmentPaymentPending);
      })
      .catch(() => {
        if (!disposed) {
          setInstallmentPaymentState(prev => ({
            ...prev,
            message: prev.message || 'Module Kkiapay indisponible pour le moment.',
          }));
        }
      });

    return () => {
      disposed = true;
      moduleInstance?.removeKkiapayListener?.('success');
      moduleInstance?.removeKkiapayListener?.('failed');
      moduleInstance?.addPendingListener(() => {});
    };
  }, [handleInstallmentPaymentFailed, handleInstallmentPaymentPending, verifyInstallmentPayment]);

  const startInstallmentPayment = async (plan: InstallmentPlanView) => {
    if (installmentPaymentState.status === 'starting' || installmentPaymentState.status === 'verifying') {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setInstallmentPaymentState({
        status: 'failed',
        planId: plan.id,
        message: 'Connectez votre compte client avant de cotiser.',
      });
      return;
    }

    const defaultAmount = Math.min(plan.balanceRemaining, Math.max(500, Math.round(plan.balanceRemaining / 4)));
    const amount = Math.round(Number(installmentAmounts[plan.id] || defaultAmount));
    setInstallmentPaymentState({
      status: 'starting',
      planId: plan.id,
      message: 'Preparation du versement Kkiapay...',
    });

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/installments/kkiapay/initiate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installmentPlanId: plan.id,
          amount,
        }),
      });
      const body = (await response.json().catch(() => null)) as InitiateInstallmentPaymentResponse | null;

      if (!response.ok || !body?.paymentId || !body.publicKey) {
        throw new Error(body?.message || 'Preparation de la cotisation indisponible.');
      }

      pendingInstallmentPaymentRef.current = { installmentPlanId: plan.id, paymentId: body.paymentId };
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
      setInstallmentPaymentState({
        status: 'opened',
        planId: plan.id,
        message: 'Validez le versement sur votre telephone des que la demande Mobile Money apparait.',
      });
    } catch (error) {
      setInstallmentPaymentState({
        status: 'failed',
        planId: plan.id,
        message: error instanceof Error ? error.message : 'Impossible de lancer la cotisation Kkiapay.',
      });
    }
  };

  const orders = useMemo(
    () => mergeOrders(remoteOrders, localOrders, loaded && !remoteError),
    [loaded, localOrders, remoteError, remoteOrders]
  );
  const hasLocalOnlyOrders = orders.some(order => order.source === 'local');
  const clearLocalOrderHistory = () => {
    clearCheckoutDrafts();
    setLocalOrders([]);
  };

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
              {isAuthenticated ? (
                <InstallmentSection
                  plans={installmentPlans}
                  payments={installmentPayments}
                  amounts={installmentAmounts}
                  paymentState={installmentPaymentState}
                  onAmountChange={(planId, value) => setInstallmentAmounts(prev => ({ ...prev, [planId]: value }))}
                  onPay={startInstallmentPayment}
                />
              ) : null}
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
                  {hasLocalOnlyOrders ? (
                    <button
                      type="button"
                      onClick={clearLocalOrderHistory}
                      className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-600"
                    >
                      Effacer le suivi local
                    </button>
                  ) : null}
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
      {installmentPaymentModal ? (
        <KkiapayInstructionModal
          tone={installmentPaymentModal.tone}
          eyebrow={installmentPaymentModal.eyebrow}
          title={installmentPaymentModal.title}
          body={installmentPaymentModal.body}
          primaryLabel={installmentPaymentModal.tone === 'success' ? "Retour dans l'application" : "J'ai compris"}
          onPrimary={() => setInstallmentPaymentModal(null)}
          secondaryHref="/commandes"
          secondaryLabel="Voir mes cotisations"
        />
      ) : null}
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
          {order.receiptAvailable && order.orderId ? (
            <ReceiptDownloadButton target={{ orderId: order.orderId }} />
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

function InstallmentSection({
  plans,
  payments,
  amounts,
  paymentState,
  onAmountChange,
  onPay,
}: {
  plans: InstallmentPlanView[];
  payments: InstallmentPaymentView[];
  amounts: Record<string, string>;
  paymentState: {
    status: 'idle' | 'starting' | 'opened' | 'verifying' | 'succeeded' | 'failed';
    planId: string | null;
    message: string;
  };
  onAmountChange: (planId: string, value: string) => void;
  onPay: (plan: InstallmentPlanView) => void;
}) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase text-[#059669]">Cotisations</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Mes dossiers et versements</h2>
        </div>
        <span className="rounded-full bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
          Kkiapay uniquement
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {plans.map(plan => {
          const planPayments = payments.filter(payment => payment.installmentPlanId === plan.id);
          const progress =
            plan.productTotal > 0 ? Math.max(0, Math.min(100, Math.round((plan.amountPaid / plan.productTotal) * 100))) : 0;
          const canPay = ['active', 'late'].includes(plan.status) && plan.balanceRemaining > 0;
          const defaultAmount = Math.min(plan.balanceRemaining, Math.max(500, Math.round(plan.balanceRemaining / 4)));
          const amountValue = amounts[plan.id] ?? String(defaultAmount);
          const isBusy =
            paymentState.planId === plan.id &&
            (paymentState.status === 'starting' || paymentState.status === 'verifying');

          return (
            <article key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">
                    {formatCheckoutReference(plan.orderReference || plan.orderId || plan.id)}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950">
                    {plan.selectedProduct?.name || 'Telephone a choisir'}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${INSTALLMENT_STATUS_STYLES[plan.status]}`}>
                  {INSTALLMENT_STATUS_LABELS[plan.status] || plan.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryBox label="Objectif" value={formatPrice(plan.productTotal)} />
                <SummaryBox label="Deja verse" value={formatPrice(plan.amountPaid)} tone="green" />
                <SummaryBox label="Reste" value={formatPrice(plan.balanceRemaining)} tone="orange" />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#059669]" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-4 rounded-2xl bg-white p-3">
                <p className="text-xs font-extrabold uppercase text-slate-500">Historique paiements</p>
                {planPayments.length === 0 ? (
                  <p className="mt-2 text-sm font-bold text-slate-500">Aucun versement confirme ou ouvert pour ce dossier.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {planPayments.slice(0, 5).map(payment => (
                      <div key={payment.id} className="grid gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-black text-slate-950">{formatPrice(payment.amount)}</p>
                          <p className="font-semibold text-slate-500">
                            {payment.providerTransactionId || payment.providerReference || payment.id}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-extrabold text-slate-700">
                            {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                          </p>
                          <p className="font-semibold text-slate-500">{formatDate(payment.verifiedAt || payment.createdAt)}</p>
                          {payment.status === 'succeeded' ? (
                            <div className="mt-2">
                              <ReceiptDownloadButton
                                target={{ paymentId: payment.id }}
                                label="Recu"
                                compact
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canPay ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Montant a verser</span>
                    <input
                      value={amountValue}
                      onChange={event => onAmountChange(plan.id, event.target.value.replace(/[^0-9]/g, ''))}
                      inputMode="numeric"
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/10"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onPay(plan)}
                    disabled={isBusy}
                    className="h-11 self-end rounded-2xl bg-[#059669] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isBusy ? 'Traitement...' : 'Cotiser'}
                  </button>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                  {plan.status === 'completed'
                    ? 'Dossier solde.'
                    : plan.status === 'cancelled'
                      ? 'Dossier annule.'
                      : 'Le contrat signe doit etre valide par AfricaPhone avant le premier versement Kkiapay.'}
                </p>
              )}

              {paymentState.planId === plan.id && paymentState.message ? (
                <p
                  className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold leading-5 ${
                    paymentState.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-600'
                  }`}
                >
                  {paymentState.message}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
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

function SummaryBox({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'orange' }) {
  const valueClass =
    tone === 'green' ? 'text-[#059669]' : tone === 'orange' ? 'text-orange-700' : 'text-slate-950';

  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClass}`}>{value}</p>
    </div>
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

function ReceiptDownloadButton({
  target,
  label = 'Telecharger le recu',
  compact = false,
}: {
  target: Parameters<typeof downloadPaymentReceipt>[0];
  label?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<{ busy: boolean; message: string }>({ busy: false, message: '' });

  const handleDownload = async () => {
    if (state.busy) {
      return;
    }

    setState({ busy: true, message: '' });

    try {
      await downloadPaymentReceipt(target);
      setState({ busy: false, message: 'Recu telecharge.' });
    } catch (error) {
      setState({
        busy: false,
        message: error instanceof Error ? error.message : 'Telechargement du recu impossible.',
      });
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={state.busy}
        className={
          compact
            ? 'rounded-full bg-[#ECFDF5] px-3 py-1.5 text-[11px] font-extrabold text-[#059669] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
            : 'mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[#ECFDF5] text-xs font-extrabold text-[#059669] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
        }
      >
        {state.busy ? 'Preparation...' : label}
      </button>
      {state.message ? <p className="mt-2 text-[11px] font-bold text-slate-500">{state.message}</p> : null}
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
