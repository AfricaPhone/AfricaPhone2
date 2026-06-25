'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getDownloadURL, ref } from 'firebase/storage';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { PAYMENT_CONFIG } from '@/config/payment';
import {
  getCustomerDocumentAccept,
  uploadCustomerDocument,
  type CustomerDocumentUploadResult,
} from '@/lib/customerDocuments';
import { auth, storage } from '@/lib/firebaseClient';
import { loadKkiapay, type KkiapayListenerData } from '@/lib/kkiapay';
import {
  type CustomerProfileDraft,
  getCustomerProfileDraft,
  getCustomerProfileReadiness,
  INITIAL_CUSTOMER_PROFILE,
  loadCustomerProfileFromFirestore,
  saveCustomerProfileDraft,
  syncCustomerProfileToFirestore,
} from '@/lib/customerProfile';
import type { CustomerDocumentType, CustomerPaymentStatus } from '@/types/customerOrders';
import { formatPrice } from '@/utils/formatPrice';

type ProfileTextField = 'fullName' | 'email' | 'whatsapp' | 'address' | 'city';
type ProfileFileField = 'photoName' | 'idDocumentName' | 'contractName';
type UploadStatus = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'failed';
type StatusTone = 'green' | 'orange' | 'slate';
type UploadState = {
  status: UploadStatus;
  message: string;
};
type CotisationContractTemplate = {
  fileName: string;
  downloadUrl: string;
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
type InstallmentsSnapshot = {
  plans: InstallmentPlanView[];
  payments: InstallmentPaymentView[];
};
type InstallmentPaymentUiState = {
  status: 'idle' | 'starting' | 'opened' | 'verifying' | 'succeeded' | 'failed';
  planId: string | null;
  message: string;
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

const PROFILE_FILE_CONFIG: Record<
  ProfileFileField,
  {
    documentType: CustomerDocumentType;
    selectedMessage: string;
  }
> = {
  photoName: {
    documentType: 'profile_photo',
    selectedMessage: 'Photo selectionnee, envoi apres connexion.',
  },
  idDocumentName: {
    documentType: 'identity_card',
    selectedMessage: 'Piece selectionnee, envoi apres connexion.',
  },
  contractName: {
    documentType: 'signed_contract',
    selectedMessage: 'Contrat selectionne, envoi apres connexion.',
  },
};

const INITIAL_PROFILE_FILES: Record<ProfileFileField, File | null> = {
  photoName: null,
  idDocumentName: null,
  contractName: null,
};

const INITIAL_UPLOAD_STATES: Record<ProfileFileField, UploadState> = {
  photoName: { status: 'idle', message: '' },
  idDocumentName: { status: 'idle', message: '' },
  contractName: { status: 'idle', message: '' },
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

const PAYMENT_STATUS_LABELS: Record<CustomerPaymentStatus, string> = {
  not_required: 'Non requis',
  pending: 'En attente',
  provider_opened: 'Paiement ouvert',
  succeeded: 'Paiement confirme',
  failed: 'Echec paiement',
  cancelled: 'Paiement annule',
  refunded: 'Rembourse',
};

const CALENDAR_WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const applyProfileUploadResult = (
  profile: CustomerProfileDraft,
  field: ProfileFileField,
  result: CustomerDocumentUploadResult
): CustomerProfileDraft => {
  if (field === 'photoName') {
    return {
      ...profile,
      photoName: result.fileName,
      photoDocumentId: result.id,
      photoStoragePath: result.storagePath,
    };
  }

  if (field === 'idDocumentName') {
    return {
      ...profile,
      idDocumentName: result.fileName,
      idDocumentId: result.id,
      idDocumentStoragePath: result.storagePath,
    };
  }

  return {
    ...profile,
    contractName: result.fileName,
    contractDocumentId: result.id,
    contractDocumentStoragePath: result.storagePath,
  };
};

const getInitials = (name: string) => {
  const parts = name
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'AP';
  }

  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
};

const getProfileStage = (profileReadiness: ReturnType<typeof getCustomerProfileReadiness>) => {
  if (profileReadiness.cotisationReady) {
    return {
      title: 'Pret cotisation',
      tone: 'green' as const,
    };
  }

  if (profileReadiness.fullReady) {
    return {
      title: 'Pret paiement',
      tone: 'green' as const,
    };
  }

  if (profileReadiness.lightReady) {
    return {
      title: 'Achat simple',
      tone: 'orange' as const,
    };
  }

  return {
    title: 'A completer',
    tone: 'slate' as const,
  };
};

const getNextProfileStep = (profileReadiness: ReturnType<typeof getCustomerProfileReadiness>) => {
  if (!profileReadiness.lightReady) {
    return {
      title: 'Identite minimale',
      items: profileReadiness.missingLight,
      actionHref: '#profile-form',
      actionLabel: 'Completer',
    };
  }

  if (!profileReadiness.fullReady) {
    return {
      title: 'Paiement en ligne',
      items: profileReadiness.missingFull,
      actionHref: '#profile-form',
      actionLabel: 'Completer',
    };
  }

  if (!profileReadiness.cotisationReady) {
    return {
      title: 'Cotisation',
      items: profileReadiness.missingCotisation,
      actionHref: '#profile-documents',
      actionLabel: 'Documents',
    };
  }

  return {
    title: 'Profil complet',
    items: [],
    actionHref: '/checkout',
    actionLabel: 'Checkout',
  };
};

const parseDateValue = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const paymentDate = (payment: InstallmentPaymentView) => parseDateValue(payment.verifiedAt || payment.createdAt);

const formatDateLabel = (value: string | null | undefined) => {
  const date = parseDateValue(value);
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

const paymentTone = (status: CustomerPaymentStatus) => {
  if (status === 'succeeded') {
    return 'green';
  }

  if (status === 'failed' || status === 'cancelled') {
    return 'rose';
  }

  return 'orange';
};

const getKkiapayTransactionId = (data?: KkiapayListenerData) =>
  (data?.transactionId && String(data.transactionId)) || (data?.flwRef && String(data.flwRef)) || null;

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

const getCalendarAnchorDate = (plans: InstallmentPlanView[], payments: InstallmentPaymentView[]) => {
  const paymentDates = payments
    .map(paymentDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (paymentDates[0]) {
    return paymentDates[0];
  }

  const planDates = plans
    .map(plan => parseDateValue(plan.lastPaymentAt || plan.activatedAt || plan.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());

  return planDates[0] || new Date();
};

const buildCalendarDays = (anchor: Date) => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ key: string; day: number | null; dateKey: string | null }> = [];

  for (let index = 0; index < offset; index += 1) {
    days.push({ key: `blank-${index}`, day: null, dateKey: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    days.push({ key: dateKey(date), day, dateKey: dateKey(date) });
  }

  return days;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<CustomerProfileDraft>(INITIAL_CUSTOMER_PROFILE);
  const [saved, setSaved] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_up');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<ProfileFileField, File | null>>(INITIAL_PROFILE_FILES);
  const [uploadStates, setUploadStates] = useState<Record<ProfileFileField, UploadState>>(INITIAL_UPLOAD_STATES);
  const [contractTemplate, setContractTemplate] = useState<CotisationContractTemplate | null>(null);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanView[]>([]);
  const [installmentPayments, setInstallmentPayments] = useState<InstallmentPaymentView[]>([]);
  const [installmentsLoaded, setInstallmentsLoaded] = useState(false);
  const [installmentsError, setInstallmentsError] = useState('');
  const [installmentAmounts, setInstallmentAmounts] = useState<Record<string, string>>({});
  const [installmentPaymentState, setInstallmentPaymentState] = useState<InstallmentPaymentUiState>({
    status: 'idle',
    planId: null,
    message: '',
  });
  const pendingInstallmentPaymentRef = useRef<{ installmentPlanId: string; paymentId: string } | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [selectedProfilePhotoUrl, setSelectedProfilePhotoUrl] = useState('');

  useEffect(() => {
    const savedProfile = getCustomerProfileDraft();
    if (savedProfile) {
      setProfile(savedProfile);
      setAuthForm(prev => ({ ...prev, email: savedProfile.email }));
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    fetch('/api/contract-template')
      .then(response => (response.ok ? response.json() : null))
      .then((body: { template?: CotisationContractTemplate | null } | null) => {
        if (!disposed) {
          setContractTemplate(body?.template || null);
        }
      })
      .catch(() => {
        if (!disposed) {
          setContractTemplate(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  const loadInstallments = useCallback(async (idToken: string): Promise<InstallmentsSnapshot> => {
    const response = await fetch('/api/installments', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    const body = (await response.json().catch(() => null)) as InstallmentsApiResponse | null;

    if (!response.ok) {
      throw new Error(body?.message || 'Suivi cotisation indisponible.');
    }

    return {
      plans: Array.isArray(body?.installments) ? body.installments : [],
      payments: Array.isArray(body?.payments) ? body.payments : [],
    };
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!active) {
        return;
      }

      setAuthUser(user);
      setAuthReady(true);
      setAuthError('');

      if (!user) {
        setInstallmentPlans([]);
        setInstallmentPayments([]);
        setInstallmentsLoaded(true);
        setInstallmentsError('');
        return;
      }

      setAuthForm(prev => ({ ...prev, email: user.email || prev.email, password: '' }));
      setInstallmentsLoaded(false);
      setInstallmentsError('');

      try {
        const remoteProfile = await loadCustomerProfileFromFirestore(user);
        if (remoteProfile && active) {
          setProfile(prev => ({ ...prev, ...remoteProfile }));
          saveCustomerProfileDraft(remoteProfile);
          setSaved(true);
          setAuthMessage('Profil du compte charge.');
        }
      } catch (error) {
        console.error('account: unable to load customer profile', error);
        if (active) {
          setAuthError('Compte connecte, mais les informations du profil n ont pas pu etre chargees.');
        }
      }

      try {
        const token = await user.getIdToken();
        const installments = await loadInstallments(token);

        if (active) {
          setInstallmentPlans(installments.plans);
          setInstallmentPayments(installments.payments);
          setInstallmentsLoaded(true);
        }
      } catch (error) {
        console.error('account: unable to load installments', error);
        if (active) {
          setInstallmentPlans([]);
          setInstallmentPayments([]);
          setInstallmentsLoaded(true);
          setInstallmentsError('Suivi cotisation indisponible pour le moment.');
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadInstallments]);

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
        const installments = await loadInstallments(token);
        setInstallmentPlans(installments.plans);
        setInstallmentPayments(installments.payments);
        setInstallmentsLoaded(true);
        setInstallmentsError('');
        setInstallmentPaymentState({
          status: 'succeeded',
          planId: pendingPayment.installmentPlanId,
          message: 'Cotisation confirmee. Le recu sera envoye si la messagerie est configuree.',
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
    };
  }, [handleInstallmentPaymentFailed, verifyInstallmentPayment]);

  useEffect(() => {
    const selectedPhoto = selectedFiles.photoName;

    if (!selectedPhoto) {
      setSelectedProfilePhotoUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setSelectedProfilePhotoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFiles.photoName]);

  useEffect(() => {
    let active = true;

    if (!profile.photoStoragePath) {
      setProfilePhotoUrl('');
      return () => {
        active = false;
      };
    }

    setProfilePhotoUrl('');

    getDownloadURL(ref(storage, profile.photoStoragePath))
      .then(url => {
        if (active) {
          setProfilePhotoUrl(url);
        }
      })
      .catch(error => {
        console.error('account: unable to load profile photo', error);
        if (active) {
          setProfilePhotoUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [profile.photoStoragePath]);

  const profileReadiness = useMemo(() => getCustomerProfileReadiness(profile), [profile]);
  const profileStage = useMemo(() => getProfileStage(profileReadiness), [profileReadiness]);
  const nextProfileStep = useMemo(() => getNextProfileStep(profileReadiness), [profileReadiness]);
  const accountLabel = !authReady ? 'Verification' : authUser ? 'Connecte' : 'A connecter';
  const profilePhotoSource = selectedProfilePhotoUrl || profilePhotoUrl;

  const updateField = (field: ProfileTextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setProfile(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleFile = (field: ProfileFileField) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSaved(false);
    setSelectedFiles(prev => ({ ...prev, [field]: file }));
    setUploadStates(prev => ({
      ...prev,
      [field]: file
        ? { status: 'selected', message: PROFILE_FILE_CONFIG[field].selectedMessage }
        : { status: 'idle', message: '' },
    }));
    setProfile(prev => ({ ...prev, [field]: file?.name ?? '' }));
  };

  const uploadSelectedDocuments = async (user: User, baseProfile: CustomerProfileDraft) => {
    let nextProfile = baseProfile;

    for (const field of Object.keys(PROFILE_FILE_CONFIG) as ProfileFileField[]) {
      const file = selectedFiles[field];
      if (!file) {
        continue;
      }

      setUploadStates(prev => ({
        ...prev,
        [field]: { status: 'uploading', message: 'Envoi du document...' },
      }));

      try {
        const result = await uploadCustomerDocument({
          user,
          file,
          documentType: PROFILE_FILE_CONFIG[field].documentType,
        });

        nextProfile = applyProfileUploadResult(nextProfile, field, result);
        setUploadStates(prev => ({
          ...prev,
          [field]: { status: 'uploaded', message: 'Document envoye pour verification.' },
        }));
      } catch (error) {
        setUploadStates(prev => ({
          ...prev,
          [field]: {
            status: 'failed',
            message: error instanceof Error ? error.message : 'Envoi impossible pour ce document.',
          },
        }));
        throw error;
      }
    }

    return nextProfile;
  };

  const syncProfile = async (user: User, nextProfile = profile) => {
    setIsSyncingProfile(true);
    try {
      const profileWithUploads = await uploadSelectedDocuments(user, nextProfile);
      const syncedProfile = await syncCustomerProfileToFirestore(profileWithUploads, user);
      setProfile(syncedProfile);
      setSelectedFiles(INITIAL_PROFILE_FILES);
      setSaved(true);
      setAuthMessage('Profil enregistre dans votre compte.');
      setAuthError('');
    } catch (error) {
      console.error('account: unable to sync customer profile', error);
      setAuthError('Profil local enregistre, mais mise a jour du compte impossible pour le moment.');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const localProfile = saveCustomerProfileDraft(profile);
    setProfile(localProfile);
    setSaved(true);
    setAuthMessage(
      authUser
        ? 'Profil enregistre. Mise a jour du compte en cours...'
        : 'Profil local enregistre. Connectez le compte pour envoyer les documents.'
    );

    if (authUser) {
      await syncProfile(authUser, localProfile);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAuthWorking(true);
    setAuthError('');
    setAuthMessage('');

    const email = (authForm.email || profile.email).trim();
    const password = authForm.password.trim();

    if (!email.includes('@') || password.length < 6) {
      setAuthError('Email valide et mot de passe de 6 caracteres minimum requis.');
      setIsAuthWorking(false);
      return;
    }

    try {
      const credential =
        authMode === 'sign_up'
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      if (profile.fullName.trim()) {
        await updateProfile(credential.user, { displayName: profile.fullName.trim() });
      }

      const localProfile = saveCustomerProfileDraft({ ...profile, email });
      setProfile(localProfile);
      await syncProfile(credential.user, localProfile);
      setAuthMessage(authMode === 'sign_up' ? 'Compte client cree et profil enregistre.' : 'Compte client connecte.');
    } catch (error) {
      console.error('account: auth failed', error);
      setAuthError(
        authMode === 'sign_up'
          ? 'Creation du compte impossible. Verifiez votre email et votre mot de passe.'
          : 'Connexion impossible. Verifiez email et mot de passe.'
      );
    } finally {
      setIsAuthWorking(false);
      setAuthForm(prev => ({ ...prev, password: '' }));
    }
  };

  const handleSignOut = async () => {
    setAuthError('');
    setAuthMessage('');

    try {
      await signOut(auth);
      setAuthMessage('Compte deconnecte. Le profil local reste disponible.');
    } catch (error) {
      console.error('account: sign out failed', error);
      setAuthError('Deconnexion impossible pour le moment.');
    }
  };

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
        message: 'Finalisez le versement dans la fenetre Kkiapay.',
      });
    } catch (error) {
      setInstallmentPaymentState({
        status: 'failed',
        planId: plan.id,
        message: error instanceof Error ? error.message : 'Impossible de lancer la cotisation Kkiapay.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Compte"
          title="Profil client"
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard eyebrow="Profil" title={profileStage.title} tone={profileStage.tone} />
          <StatusCard
            eyebrow="Paiement"
            title={profileReadiness.fullReady ? 'Disponible' : 'A completer'}
            tone={profileReadiness.fullReady ? 'green' : 'orange'}
          />
          <StatusCard
            eyebrow="Documents"
            title={profileReadiness.cotisationReady ? 'Complets' : 'A completer'}
            tone={profileReadiness.cotisationReady ? 'green' : 'slate'}
          />
          <StatusCard
            eyebrow="Compte"
            title={accountLabel}
            tone={authUser ? 'green' : 'slate'}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <form
            id="profile-form"
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#059669] text-lg font-black text-white">
                {profilePhotoSource ? (
                  <span
                    role="img"
                    aria-label={profile.fullName ? `Photo de ${profile.fullName}` : 'Photo du profil client'}
                    className="block h-full w-full"
                    style={{ background: `center / cover no-repeat url(${JSON.stringify(profilePhotoSource)})` }}
                  />
                ) : (
                  getInitials(profile.fullName)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase text-[#059669]">Identite du client</p>
                <h2 className="mt-1 text-xl font-black">Informations a valider</h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nom complet"
                value={profile.fullName}
                onChange={updateField('fullName')}
                placeholder="Ex : Aline Hounkpe"
              />
              <Field
                label="Email fonctionnel"
                value={profile.email}
                onChange={updateField('email')}
                placeholder="nom@email.com"
                type="email"
              />
              <Field
                label="Numero WhatsApp"
                value={profile.whatsapp}
                onChange={updateField('whatsapp')}
                placeholder="+229 01..."
                type="tel"
              />
              <Field
                label="Ville / quartier"
                value={profile.city}
                onChange={updateField('city')}
                placeholder="Abomey-Calavi, Cotonou..."
              />
            </div>

            <label className="block">
              <span className="text-xs font-extrabold uppercase text-slate-500">Adresse complete</span>
              <textarea
                value={profile.address}
                onChange={updateField('address')}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#059669] focus:bg-white focus:ring-2 focus:ring-[#059669]/10"
                placeholder="Maison, rue, repere, zone de livraison..."
              />
            </label>

            <div className="rounded-2xl border border-[#059669]/15 bg-[#ECFDF5] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#059669]">Contrat cotisation</p>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-700">
                    Telechargez le PDF, imprimez, signez puis envoyez le contrat signe.
                  </p>
                </div>
                {contractTemplate?.downloadUrl ? (
                  <a
                    href={contractTemplate.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[#059669] px-4 text-xs font-extrabold text-white"
                  >
                    Telecharger
                  </a>
                ) : (
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-500">
                    En attente admin
                  </span>
                )}
              </div>
            </div>

            <div id="profile-documents" className="grid gap-3 sm:grid-cols-3">
              <FileField
                label="Photo profil"
                fileName={profile.photoName}
                accept={getCustomerDocumentAccept('profile_photo')}
                uploadState={uploadStates.photoName}
                onChange={handleFile('photoName')}
              />
              <FileField
                label="Piece d identite"
                fileName={profile.idDocumentName}
                accept={getCustomerDocumentAccept('identity_card')}
                uploadState={uploadStates.idDocumentName}
                onChange={handleFile('idDocumentName')}
              />
              <FileField
                label="Contrat signe"
                fileName={profile.contractName}
                accept={getCustomerDocumentAccept('signed_contract')}
                uploadState={uploadStates.contractName}
                onChange={handleFile('contractName')}
              />
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[#059669] text-sm font-extrabold text-white transition hover:bg-[#047857]"
              disabled={isSyncingProfile}
            >
              {isSyncingProfile ? 'Synchronisation...' : 'Enregistrer le profil'}
            </button>
            {saved ? (
              <p className="rounded-2xl bg-[#ECFDF5] px-3 py-2 text-sm font-extrabold text-[#059669]">
                {authUser
                  ? 'Profil client enregistre et pret pour le checkout.'
                  : 'Profil local enregistre. Il sera repris automatiquement dans le checkout.'}
              </p>
            ) : null}
          </form>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Compte client</p>
              {!authReady ? (
                <p className="mt-3 text-sm font-bold text-slate-500">Verification du compte...</p>
              ) : authUser ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl bg-[#ECFDF5] p-4">
                    <p className="text-sm font-black text-[#059669]">Compte client connecte</p>
                    <p className="mt-1 break-all text-xs font-bold text-slate-600">{authUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSignOut();
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-600 transition hover:border-[#059669]/30"
                  >
                    Se deconnecter
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('sign_up');
                      }}
                      className={`h-10 rounded-xl text-xs font-extrabold ${
                        authMode === 'sign_up' ? 'bg-white text-[#059669] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Creer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('sign_in');
                      }}
                      className={`h-10 rounded-xl text-xs font-extrabold ${
                        authMode === 'sign_in' ? 'bg-white text-[#059669] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Connecter
                    </button>
                  </div>
                  <Field
                    label="Email du compte"
                    value={authForm.email}
                    onChange={event => {
                      setAuthForm(prev => ({ ...prev, email: event.target.value }));
                    }}
                    placeholder="nom@email.com"
                    type="email"
                  />
                  <Field
                    label="Mot de passe"
                    value={authForm.password}
                    onChange={event => {
                      setAuthForm(prev => ({ ...prev, password: event.target.value }));
                    }}
                    placeholder="6 caracteres minimum"
                    type="password"
                  />
                  <button
                    type="submit"
                    disabled={isAuthWorking}
                    className="h-11 w-full rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition enabled:hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isAuthWorking ? 'Verification...' : authMode === 'sign_up' ? 'Creer le compte' : 'Se connecter'}
                  </button>
                </form>
              )}
              {authMessage ? (
                <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-bold leading-5 text-[#059669]">
                  {authMessage}
                </p>
              ) : null}
              {authError ? (
                <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
                  {authError}
                </p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Etat du profil</p>
              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold text-slate-500">Completion</span>
                  <span className="text-3xl font-black text-[#059669]">{profileReadiness.completion}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-[#059669]" style={{ width: `${profileReadiness.completion}%` }} />
                </div>
              </div>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <ReadinessItem ready={profileReadiness.lightReady} label="Achat simple" />
                <ReadinessItem ready={profileReadiness.fullReady} label="Paiement en ligne" />
                <ReadinessItem ready={profileReadiness.cotisationReady} label="Cotisation" />
              </ul>
              <div className="mt-4 rounded-2xl bg-orange-50 px-3 py-3">
                <p className="text-xs font-extrabold uppercase text-orange-700">{nextProfileStep.title}</p>
                {nextProfileStep.items.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextProfileStep.items.map(item => (
                      <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-orange-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-bold text-slate-700">Toutes les informations importantes sont disponibles.</p>
                )}
                <Link
                  href={nextProfileStep.actionHref}
                  className="mt-3 inline-flex rounded-full bg-[#F97316] px-4 py-2 text-xs font-extrabold text-white"
                >
                  {nextProfileStep.actionLabel}
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                <DocumentStatus label="Photo" ready={Boolean(profile.photoName || profile.photoDocumentId)} />
                <DocumentStatus label="Piece d identite" ready={Boolean(profile.idDocumentName || profile.idDocumentId)} />
                <DocumentStatus label="Contrat signe" ready={Boolean(profile.contractName || profile.contractDocumentId)} />
              </div>
            </section>

            <section className="rounded-3xl border border-[#059669]/15 bg-[#ECFDF5] p-4">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Acces rapides</p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/checkout"
                  className="flex h-11 items-center justify-center rounded-2xl bg-[#059669] text-sm font-extrabold text-white"
                >
                  Checkout
                </Link>
                <Link
                  href="/commandes"
                  className="flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-[#059669]"
                >
                  Commandes
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {authUser ? (
          <AccountInstallmentOverview
            plans={installmentPlans}
            payments={installmentPayments}
            loaded={installmentsLoaded}
            error={installmentsError}
            amounts={installmentAmounts}
            paymentState={installmentPaymentState}
            onAmountChange={(planId, value) => {
              setInstallmentAmounts(prev => ({ ...prev, [planId]: value }));
            }}
            onPay={startInstallmentPayment}
          />
        ) : null}
      </main>
      <MobileBottomNav />
    </div>
  );
}

function AccountInstallmentOverview({
  plans,
  payments,
  loaded,
  error,
  amounts,
  paymentState,
  onAmountChange,
  onPay,
}: {
  plans: InstallmentPlanView[];
  payments: InstallmentPaymentView[];
  loaded: boolean;
  error: string;
  amounts: Record<string, string>;
  paymentState: InstallmentPaymentUiState;
  onAmountChange: (planId: string, value: string) => void;
  onPay: (plan: InstallmentPlanView) => void;
}) {
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = paymentDate(a)?.getTime() ?? 0;
    const dateB = paymentDate(b)?.getTime() ?? 0;
    return dateB - dateA;
  });
  const totalPaid = payments
    .filter(payment => payment.status === 'succeeded')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const remainingTotal = plans.reduce((sum, plan) => sum + Math.max(0, Number(plan.balanceRemaining || 0)), 0);
  const anchorDate = getCalendarAnchorDate(plans, payments);
  const calendarDays = buildCalendarDays(anchorDate);
  const paymentsByDay = new Map<string, InstallmentPaymentView[]>();

  payments.forEach(payment => {
    const date = paymentDate(payment);
    if (!date) {
      return;
    }

    const key = dateKey(date);
    paymentsByDay.set(key, [...(paymentsByDay.get(key) || []), payment]);
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase text-[#059669]">Cotisations</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Calendrier de paiement</h2>
        </div>
        <Link
          href="/commandes"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#ECFDF5] px-4 text-xs font-extrabold text-[#059669]"
        >
          Dossiers
        </Link>
      </div>

      {!loaded ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">
          Chargement des cotisations...
        </p>
      ) : error ? (
        <p className="mt-4 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-bold text-orange-700">{error}</p>
      ) : plans.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
          <p className="text-sm font-black text-slate-950">Aucun dossier de cotisation actif.</p>
          <Link href="/checkout" className="mt-3 inline-flex rounded-full bg-[#F97316] px-4 py-2 text-xs font-extrabold text-white">
            Demarrer une cotisation
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Dossiers" value={String(plans.length)} />
              <SummaryTile label="Deja verse" value={formatPrice(totalPaid)} tone="green" />
              <SummaryTile label="Reste" value={formatPrice(remainingTotal)} tone="orange" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {plans.slice(0, 4).map(plan => {
                const defaultAmount = Math.min(plan.balanceRemaining, Math.max(500, Math.round(plan.balanceRemaining / 4)));
                return (
                  <InstallmentProgressCard
                    key={plan.id}
                    plan={plan}
                    amountValue={amounts[plan.id] ?? String(defaultAmount)}
                    paymentState={paymentState}
                    onAmountChange={onAmountChange}
                    onPay={onPay}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black capitalize text-slate-950">{formatMonthLabel(anchorDate)}</p>
                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-500">
                  {sortedPayments.length} point(s)
                </span>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {CALENDAR_WEEK_DAYS.map((day, index) => (
                  <span key={`${day}-${index}`} className="py-1 text-[10px] font-black uppercase text-slate-400">
                    {day}
                  </span>
                ))}
                {calendarDays.map(day => {
                  const dayPayments = day.dateKey ? paymentsByDay.get(day.dateKey) || [] : [];
                  return <CalendarDay key={day.key} day={day.day} payments={dayPayments} />;
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Points de paiement</p>
              {sortedPayments.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">Aucun versement enregistre.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {sortedPayments.slice(0, 6).map(payment => (
                    <PaymentPoint key={payment.id} payment={payment} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'orange' }) {
  const valueClass =
    tone === 'green' ? 'text-[#059669]' : tone === 'orange' ? 'text-orange-700' : 'text-slate-950';

  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function InstallmentProgressCard({
  plan,
  amountValue,
  paymentState,
  onAmountChange,
  onPay,
}: {
  plan: InstallmentPlanView;
  amountValue: string;
  paymentState: InstallmentPaymentUiState;
  onAmountChange: (planId: string, value: string) => void;
  onPay: (plan: InstallmentPlanView) => void;
}) {
  const progress =
    plan.productTotal > 0 ? Math.max(0, Math.min(100, Math.round((plan.amountPaid / plan.productTotal) * 100))) : 0;
  const canPay = ['active', 'late'].includes(plan.status) && plan.balanceRemaining > 0;
  const isBusy =
    paymentState.planId === plan.id && (paymentState.status === 'starting' || paymentState.status === 'verifying');

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">{plan.orderReference || plan.orderId}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">
            {plan.selectedProduct?.name || 'Telephone a choisir'}
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#059669]">
          {INSTALLMENT_STATUS_LABELS[plan.status] || plan.status}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-[#059669]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryMini label="Objectif" value={formatPrice(plan.productTotal)} />
        <SummaryMini label="Verse" value={formatPrice(plan.amountPaid)} tone="green" />
        <SummaryMini label="Reste" value={formatPrice(plan.balanceRemaining)} tone="orange" />
      </div>

      {canPay ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Montant a verser</span>
            <input
              value={amountValue}
              onChange={event => onAmountChange(plan.id, event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/10"
            />
          </label>
          <button
            type="button"
            onClick={() => onPay(plan)}
            disabled={isBusy}
            className="h-10 self-end rounded-2xl bg-[#059669] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isBusy ? 'Traitement...' : 'Cotiser'}
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold leading-5 text-orange-700">
          {plan.status === 'completed'
            ? 'Dossier solde.'
            : plan.status === 'cancelled'
              ? 'Dossier annule.'
              : 'Validation AfricaPhone requise avant le premier versement Kkiapay.'}
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
}

function SummaryMini({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'orange' }) {
  const valueClass =
    tone === 'green' ? 'text-[#059669]' : tone === 'orange' ? 'text-orange-700' : 'text-slate-950';

  return (
    <div className="rounded-2xl bg-white px-2 py-2">
      <p className="text-[9px] font-extrabold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-[11px] font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function CalendarDay({ day, payments }: { day: number | null; payments: InstallmentPaymentView[] }) {
  if (day === null) {
    return <span className="h-10 rounded-2xl" />;
  }

  const hasPayments = payments.length > 0;
  const tone = payments.some(payment => payment.status === 'succeeded')
    ? 'green'
    : payments.some(payment => payment.status === 'failed' || payment.status === 'cancelled')
      ? 'rose'
      : 'orange';
  const dayClass = hasPayments
    ? tone === 'green'
      ? 'border-[#059669]/30 bg-[#ECFDF5] text-[#059669]'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-orange-200 bg-orange-50 text-orange-700'
    : 'border-transparent bg-white text-slate-500';

  return (
    <div className={`flex h-10 flex-col items-center justify-center rounded-2xl border text-xs font-black ${dayClass}`}>
      <span>{day}</span>
      {hasPayments ? (
        <span className="mt-0.5 flex gap-0.5">
          {payments.slice(0, 3).map(payment => (
            <span
              key={payment.id}
              className={`h-1.5 w-1.5 rounded-full ${
                paymentTone(payment.status) === 'green'
                  ? 'bg-[#059669]'
                  : paymentTone(payment.status) === 'rose'
                    ? 'bg-rose-600'
                    : 'bg-[#F97316]'
              }`}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

function PaymentPoint({ payment }: { payment: InstallmentPaymentView }) {
  const tone = paymentTone(payment.status);
  const dotClass = tone === 'green' ? 'bg-[#059669]' : tone === 'rose' ? 'bg-rose-600' : 'bg-[#F97316]';

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl bg-slate-50 px-3 py-3">
      <span className={`mt-1 h-3 w-3 rounded-full ${dotClass}`} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-black text-slate-950">{formatPrice(payment.amount)}</p>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-slate-500">
            {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateLabel(payment.verifiedAt || payment.createdAt)}</p>
        <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
          {payment.providerTransactionId || payment.providerReference || payment.id}
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  eyebrow,
  title,
  tone,
}: {
  eyebrow: string;
  title: string;
  tone: StatusTone;
}) {
  const toneClass =
    tone === 'green'
      ? 'border-[#059669]/20 bg-[#ECFDF5] text-[#059669]'
      : tone === 'orange'
        ? 'border-orange-200 bg-orange-50 text-orange-700'
        : 'border-slate-200 bg-white text-slate-950';

  return (
    <article className={`rounded-3xl border p-4 shadow-sm shadow-slate-200/70 ${toneClass}`}>
      <p className="text-xs font-extrabold uppercase opacity-80">{eyebrow}</p>
      <p className="mt-2 text-xl font-black">{title}</p>
    </article>
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

function DocumentStatus({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${ready ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-slate-200 text-slate-500'}`}>
        {ready ? 'Disponible' : 'Manquant'}
      </span>
    </div>
  );
}

function ReadinessItem({ ready, label }: { ready: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
          ready ? 'bg-[#059669] text-white' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {ready ? 'OK' : '!'}
      </span>
      <span>{label}</span>
    </li>
  );
}
