'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  getCustomerDocumentAccept,
  uploadCustomerDocument,
  type CustomerDocumentUploadResult,
} from '@/lib/customerDocuments';
import { auth } from '@/lib/firebaseClient';
import {
  type CustomerProfileDraft,
  getCustomerProfileDraft,
  getCustomerProfileReadiness,
  INITIAL_CUSTOMER_PROFILE,
  loadCustomerProfileFromFirestore,
  saveCustomerProfileDraft,
  syncCustomerProfileToFirestore,
} from '@/lib/customerProfile';
import type { CustomerDocumentType } from '@/types/customerOrders';

type ProfileTextField = 'fullName' | 'email' | 'whatsapp' | 'address' | 'city';
type ProfileFileField = 'photoName' | 'idDocumentName' | 'contractName';
type UploadStatus = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'failed';
type StatusTone = 'green' | 'orange' | 'slate';
type UploadState = {
  status: UploadStatus;
  message: string;
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

  useEffect(() => {
    const savedProfile = getCustomerProfileDraft();
    if (savedProfile) {
      setProfile(savedProfile);
      setAuthForm(prev => ({ ...prev, email: savedProfile.email }));
      setSaved(true);
    }
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
        return;
      }

      setAuthForm(prev => ({ ...prev, email: user.email || prev.email, password: '' }));

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
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const profileReadiness = useMemo(() => getCustomerProfileReadiness(profile), [profile]);
  const profileStage = useMemo(() => getProfileStage(profileReadiness), [profileReadiness]);
  const nextProfileStep = useMemo(() => getNextProfileStep(profileReadiness), [profileReadiness]);
  const accountLabel = !authReady ? 'Verification' : authUser ? 'Connecte' : 'A connecter';

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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#059669] text-lg font-black text-white">
                {getInitials(profile.fullName)}
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
      </main>
      <MobileBottomNav />
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
