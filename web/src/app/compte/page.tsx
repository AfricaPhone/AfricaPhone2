'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  type CustomerProfileDraft,
  getCustomerProfileDraft,
  getCustomerProfileReadiness,
  INITIAL_CUSTOMER_PROFILE,
  saveCustomerProfileDraft,
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

  useEffect(() => {
    const savedProfile = getCustomerProfileDraft();
    if (savedProfile) {
      setProfile(savedProfile);
      setSaved(true);
    }
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfile(saveCustomerProfileDraft(profile));
    setSaved(true);
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
            <article key={level.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">{level.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{level.description}</p>
              <p className="mt-3 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669]">
                {level.required}
              </p>
            </article>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
            <div>
              <p className="text-xs font-extrabold uppercase text-[#059669]">Identite du client</p>
              <h2 className="mt-1 text-xl font-black">Informations a valider avant paiement</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom complet" value={profile.fullName} onChange={updateField('fullName')} placeholder="Ex : Aline Hounkpe" />
              <Field label="Email fonctionnel" value={profile.email} onChange={updateField('email')} placeholder="nom@email.com" type="email" />
              <Field label="Numero WhatsApp" value={profile.whatsapp} onChange={updateField('whatsapp')} placeholder="+229 01..." type="tel" />
              <Field label="Ville / quartier" value={profile.city} onChange={updateField('city')} placeholder="Abomey-Calavi, Cotonou..." />
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
              <FileField label="Piece d identite" fileName={profile.idDocumentName} onChange={handleFile('idDocumentName')} />
              <FileField label="Contrat signe" fileName={profile.contractName} onChange={handleFile('contractName')} />
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[#059669] text-sm font-extrabold text-white transition hover:bg-[#047857]"
            >
              Enregistrer le brouillon local
            </button>
            {saved ? (
              <p className="rounded-2xl bg-[#ECFDF5] px-3 py-2 text-sm font-extrabold text-[#059669]">
                Profil local enregistre. Il sera repris automatiquement dans le checkout.
              </p>
            ) : null}
          </form>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
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
      <span className="mt-2 block truncate text-sm font-extrabold text-slate-950">
        {fileName || 'Importer'}
      </span>
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
