import Link from 'next/link';
import type { LocationInfo } from '@/data/nousTrouver';

export function NousTrouverLocations({ locations }: { locations: LocationInfo[] }) {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
      <h2 className="text-xl font-semibold text-slate-900">Nos points de service</h2>
      <p className="text-sm text-slate-600">
        Chaque espace AfricaPhone dispose d un stock physique et d un atelier de configuration express. Appelez
        avant votre passage pour verifier la disponibilite d un modele specifique.
      </p>
      <ul className="space-y-5">
        {locations.map(location => (
          <li key={location.city} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm font-semibold text-orange-500">{location.city}</p>
            <p className="text-base font-medium text-slate-900">{location.address}</p>
            <p className="text-sm text-slate-600">{location.hours}</p>
            <Link
              href={`tel:${location.phone.replace(/\s+/g, '')}`}
              className="mt-2 inline-flex text-sm font-semibold text-slate-900 hover:text-orange-500"
            >
              {location.phone}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
