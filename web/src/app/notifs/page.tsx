'use client';

import CustomerPageHeader from '@/components/CustomerPageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

const NOTIFICATIONS = [
  {
    title: 'Profil requis avant paiement',
    description: 'Avant Kkiapay, le client devra confirmer son identite, son email et son WhatsApp.',
    status: 'Regle metier',
    tone: 'green',
  },
  {
    title: 'Commande prete a verifier',
    description: 'Le panier deviendra une commande sauvegardee avec statut et choix de livraison.',
    status: 'Checkout',
    tone: 'orange',
  },
  {
    title: 'Cotisation avec documents',
    description: 'Piece d identite et contrat signe seront obligatoires avant activation du plan.',
    status: 'Cotisation',
    tone: 'green',
  },
  {
    title: 'Representant autorise',
    description: 'Le client pourra saisir le nom du representant et joindre sa piece si necessaire.',
    status: 'Retrait',
    tone: 'slate',
  },
];

const CHANNELS = [
  { label: 'WhatsApp', description: 'Messages rapides pour paiement, retrait et livraison.' },
  { label: 'Email', description: 'Contrats, recus et informations de compte.' },
  { label: 'Backoffice', description: 'Historique complet accessible depuis le compte client.' },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
        <CustomerPageHeader
          eyebrow="Notifications"
          title="Centre d alertes"
          description="Cet espace prepare les messages qui accompagneront chaque etape : creation de profil, commande, paiement, cotisation, retrait et livraison."
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {NOTIFICATIONS.map(item => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dotClass(item.tone)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-black text-slate-950">{item.title}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${pillClass(item.tone)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase text-[#059669]">Canaux prevus</p>
              <div className="mt-4 space-y-3">
                {CHANNELS.map(channel => (
                  <div key={channel.label} className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-sm font-black text-slate-950">{channel.label}</p>
                    <p className="text-xs font-semibold leading-5 text-slate-500">{channel.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#059669]/15 bg-[#ECFDF5] p-4">
              <p className="text-xs font-extrabold uppercase text-[#059669]">A valider avant connexion</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                Les notifications seront rattachees a `users/{'{uid}'}` puis affichees ici en temps reel.
              </p>
            </section>
          </aside>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function dotClass(tone: string) {
  if (tone === 'orange') {
    return 'bg-[#F97316]';
  }
  if (tone === 'slate') {
    return 'bg-slate-400';
  }
  return 'bg-[#059669]';
}

function pillClass(tone: string) {
  if (tone === 'orange') {
    return 'bg-orange-50 text-[#F97316]';
  }
  if (tone === 'slate') {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-[#ECFDF5] text-[#059669]';
}
