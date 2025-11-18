import type { StoreOverview } from '@/data/nousTrouver';

export function NousTrouverInfoSections({ overview }: { overview: StoreOverview }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-900">Notre boutique</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
          {overview.description.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-7">
          <h3 className="text-lg font-semibold text-slate-900">Services sur place</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {overview.services.map(service => (
              <li key={service.title} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">{service.title}</p>
                <p className="text-slate-600">{service.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-7">
          <h3 className="text-lg font-semibold text-slate-900">Pourquoi nous choisir</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {overview.highlights.map(highlight => (
              <li key={highlight.title} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">{highlight.title}</p>
                <p className="text-slate-600">{highlight.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
