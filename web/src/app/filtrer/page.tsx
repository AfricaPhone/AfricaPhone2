'use client';

import Link from 'next/link';

export default function FiltrerPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-16 pt-12">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catalogue</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Filtrer les produits</h1>
          <p className="text-base text-slate-600">
            Choisissez les critères qui vous intéressent. Cette page de filtres arrivera bientôt avec toutes les
            options (prix, marques, segments, promotions…). En attendant, utilisez les catégories rapides sur la page
            d’accueil ou contactez un conseiller pour un accompagnement sur mesure.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-700">
          <p className="text-sm">
            Besoin d’un filtre précis ? Écrivez-nous sur WhatsApp et nous vous guiderons vers les meilleurs smartphones
            et accessoires en stock.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Retour au catalogue
          </Link>
          <a
            href="https://wa.me/22954151522"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Discuter avec un conseiller
          </a>
        </div>
      </main>
    </div>
  );
}

