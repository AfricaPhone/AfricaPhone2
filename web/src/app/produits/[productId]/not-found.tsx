import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center text-slate-900">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Produit introuvable</h1>
        <p className="max-w-md text-sm text-slate-500">
          Le produit que vous recherchez n&apos;est plus disponible ou l&apos;URL est incorrecte. Retournez vers le
          catalogue pour explorer nos nouveautés.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-400/30 transition hover:bg-orange-600"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/#catalogue"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-500"
        >
          Voir le catalogue
        </Link>
      </div>
    </div>
  );
}
