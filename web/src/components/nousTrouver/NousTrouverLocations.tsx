import Link from "next/link";
import type { StoreOverview } from "@/data/nousTrouver";

export function NousTrouverLocations({ overview }: { overview: StoreOverview }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-900">Coordonnees boutique</h2>
        <p className="mt-2 text-sm text-slate-600">Retrouvez-nous facilement et contactez un conseiller avant votre visite.</p>
        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">Adresse</p>
            <p>{overview.address}</p>
            <Link href={overview.mapLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">
              Ouvrir dans Google Maps
            </Link>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Contact</p>
            <ul className="mt-1 space-y-1">
              <li>
                <Link href={`tel:${overview.contact.phone.replace(/\s+/g, "")}`} className="text-slate-700 hover:text-orange-500">
                  {overview.contact.phone}
                </Link>
              </li>
              <li>
                <Link href={overview.contact.whatsappLink} className="text-slate-700 hover:text-orange-500">
                  WhatsApp : {overview.contact.whatsapp}
                </Link>
              </li>
              <li>
                <Link href={`mailto:${overview.contact.email}`} className="text-slate-700 hover:text-orange-500">
                  {overview.contact.email}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-900">Horaires d'ouverture</h2>
        <p className="mt-2 text-sm text-slate-600">Passez sans rendez-vous ou planifiez votre visite selon vos disponibilites.</p>
        <ul className="mt-6 space-y-3 text-sm text-slate-700">
          {overview.openingHours.map(item => (
            <li key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-900">{item.label}</span>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
