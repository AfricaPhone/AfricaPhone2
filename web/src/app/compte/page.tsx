'use client';

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

type ProfileTextField = 'fullName' | 'email' | 'whatsapp' | 'address' | 'city';
type ProfileFileField = 'photoName' | 'idDocumentName' | 'contractName';

const PROFILE_LEVELS = [
  {
    title: 'Visiteur libre',
    description: 'Catalogue, panier et demande WhatsApp restent accessibles sans compte.',
    required: 'Aucune creation de compte',
  },
  {
    title: 'Achat avec paiement',
    description: 'Profil obligatoire avant Kkiapay pour identifier clairement le payeur.',
    required: 'Identite, email, WhatsApp, adresse',
  },
  {
    title: 'Cotisation',
    description: 'Profil complet et documents obligatoires avant activation du contrat.',
    required: 'Piece d identite et contrat signe',
  },
];

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
          setAuthMessage('Profil Firestore charge.');
        }
      } catch (error) {
        console.error('account: unable to load customer profile', error);
        if (active) {
          setAuthError('Compte connecte, mais le profil distant n a pas pu etre charge.');
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const profileReadiness = useMemo(() => getCustomerProfileReadiness(profile), [profile]);

  const updateField = (field: ProfileTextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setProfile(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleFile = (field: ProfileFileField) => (event: ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setProfile(prev => ({ ...prev, [field]: event.target.files?.[0]?.name ?? '' }));
  };

  const syncProfile = async (user: User, nextProfile = profile) => {
    setIsSyncingProfile(true);
    try {
      const syncedProfile = await syncCustomerProfileToFirestore(nextProfile, user);
      setProfile(syncedProfile);
      setSaved(true);
      setAuthMessage('Profil synchronise avec le compte client.');
      setAuthError('');
    } catch (error) {
      console.error('account: unable to sync customer profile', error);
      setAuthError('Profil local enregistre, mais synchronisation Firebase impossible pour le moment.');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const localProfile = saveCustomerProfileDraft(profile);
    setProfile(localProfile);
    setSaved(true);
    setAuthMessage(authUser ? 'Profil local enregistre. Synchronisation en cours...' : 'Profil local enregistre.');

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
      setAuthMessage(authMode === 'sign_up' ? 'Compte client cree et profil synchronise.' : 'Compte client connecte.');
    } catch (error) {
      console.error('account: auth failed', error);
      setAuthError(
        authMode === 'sign_up'
          ? 'Creation du compte impossible. Verifiez que Firebase Auth email/mot de passe est active.'
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
          description="La creation du profil reste progressive : elle devient obligatoire seulement quand un paiement, une cotisation, un document ou un retrait par representant entre en jeu."
        />

        <section className="grid gap-3 md:grid-cols-3">
          {PROFILE_LEVELS.map(level => (
            <article
              key={level.title}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70"
            >
              <p className="text-xs font-extrabold uppercase text-[#059669]">{level.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{level.description}</p>
              <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
                {level.required}
              </p>
            </article>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70"
          >
            <div>
              <p className="text-xs font-extrabold uppercase text-[#059669]">Identite du client</p>
              <h2 className="mt-1 text-xl font-black">Informations a valider avant paiement</h2>
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

            <div className="grid gap-3 sm:grid-cols-3">
              <FileField label="Photo profil" fileName={profile.photoName} onChange={handleFile('photoName')} />
              <FileField
                label="Piece d identite"
                fileName={profile.idDocumentName}
                onChange={handleFile('idDocumentName')}
              />
              <FileField label="Contrat signe" fileName={profile.contractName} onChange={handleFile('contractName')} />
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
                <p className="mt-3 text-sm font-bold text-slate-500">Verification de session...</p>
              ) : authUser ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl bg-[#ECFDF5] p-4">
                    <p className="text-sm font-black text-[#059669]">Compte connecte</p>
                    <p className="mt-1 break-all text-xs font-bold text-slate-600">{authUser.email}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {authUser.emailVerified ? 'Email verifie' : 'Email non verifie dans Firebase'}
                    </p>
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
                <ReadinessItem ready={profileReadiness.lightReady} label="Profil leger : nom et WhatsApp" />
                <ReadinessItem ready={profileReadiness.fullReady} label="Paiement Kkiapay : profil complet" />
                <ReadinessItem ready={profileReadiness.cotisationReady} label="Cotisation : identite et contrat" />
              </ul>
              {profile.updatedAt ? (
                <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                  Derniere sauvegarde locale : {new Date(profile.updatedAt).toLocaleString('fr-FR')}
                </p>
              ) : null}
              {profile.firestoreSyncedAt ? (
                <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-bold text-[#059669]">
                  Synchronise Firebase : {new Date(profile.firestoreSyncedAt).toLocaleString('fr-FR')}
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </main>
      <MobileBottomNav />
    </div>
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
  onChange,
}: {
  label: string;
  fileName: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
      <span className="text-xs font-extrabold uppercase text-slate-500">{label}</span>
      <input type="file" onChange={onChange} className="sr-only" />
      <span className="mt-2 block truncate text-sm font-extrabold text-slate-950">{fileName || 'Importer'}</span>
    </label>
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
