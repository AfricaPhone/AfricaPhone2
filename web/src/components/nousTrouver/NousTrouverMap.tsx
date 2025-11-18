export function NousTrouverMap({ title, mapSrc }: { title: string; mapSrc: string }) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">
          Utilisez Google Maps pour obtenir un itineraire direct vers notre showroom principal a Cotonou.
        </p>
      </div>
      <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 sm:h-80 lg:h-96">
        <iframe
          title="Carte AfricaPhone Cotonou"
          src={mapSrc}
          className="h-full w-full"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}
