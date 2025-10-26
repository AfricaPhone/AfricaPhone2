import Link from 'next/link';
import type { SupportChannel } from '@/data/nousTrouver';

export function NousTrouverSupport({
  channels,
  logisticsLabel,
  logisticsHours,
}: {
  channels: SupportChannel[];
  logisticsLabel: string;
  logisticsHours: { weekday: string; weekend: string };
}) {
  return (
    <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-7">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Contact direct</h2>
        <p className="text-sm text-slate-600">
          L equipe support repond sous 15 minutes pendant les heures d ouverture, et sous 2 heures le reste du temps.
        </p>
      </div>
      <ul className="space-y-4">
        {channels.map(channel => (
          <li key={channel.label} className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{channel.label}</span>
            <Link href={channel.href} className="text-sm font-semibold text-slate-900 hover:text-orange-500">
              {channel.value}
            </Link>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{logisticsLabel}</p>
        <p>{logisticsHours.weekday}</p>
        <p>{logisticsHours.weekend}</p>
      </div>
    </aside>
  );
}
