'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { footerColumns, footerLegal } from '@/data/storefront';
import { storeOverview } from '@/data/nousTrouver';

const isExternalHref = (href: string) => href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
const phoneHref = `tel:${storeOverview.contact.phone.replace(/[^\d+]/g, '')}`;
const locationTitle = storeOverview.address.split(',')[0] || 'Boutique AfricaPhone';

export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-gradient-to-b from-white to-[#ECFDF5] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-7">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#059669] text-base font-black text-white shadow-sm shadow-[#059669]/25">
                  AP
                </span>
                <span>
                  Africa<span className="text-[#059669]">Phone</span>
                </span>
              </Link>
              <p className="max-w-xl text-sm font-medium leading-6 text-slate-600">
                Smartphones, tablettes et accessoires disponibles avec conseil en boutique, configuration et assistance
                locale.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBlock icon={<PinIcon className="h-5 w-5" />} label="Adresse" value={storeOverview.address}>
                <Link
                  href={storeOverview.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-extrabold text-[#059669] transition hover:text-[#047857]"
                >
                  Ouvrir Google Maps
                </Link>
              </InfoBlock>
              <InfoBlock icon={<PhoneIcon className="h-5 w-5" />} label="Contact" value={storeOverview.contact.phone}>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={phoneHref}
                    className="rounded-full bg-[#059669] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#047857]"
                  >
                    Appeler
                  </Link>
                  <Link
                    href={storeOverview.contact.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#F97316] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#EA580C]"
                  >
                    WhatsApp
                  </Link>
                </div>
              </InfoBlock>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {storeOverview.openingHours.map(item => (
                <div key={item.label} className="rounded-2xl border border-[#059669]/15 bg-[#ECFDF5] px-4 py-3">
                  <p className="text-xs font-bold uppercase text-[#059669]">{item.label}</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-[#059669]">Showroom</p>
                <h2 className="text-lg font-extrabold">{locationTitle}</h2>
              </div>
              <Link
                href={storeOverview.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-[#059669]/20 bg-[#ECFDF5] px-3 py-2 text-xs font-extrabold text-[#059669] transition hover:border-[#059669]/40 hover:bg-white"
              >
                Itineraire
              </Link>
            </div>
            <div className="relative h-72 bg-slate-200 sm:h-80 lg:h-full lg:min-h-[360px]">
              <iframe
                title="Carte AfricaPhone Cotonou"
                src={storeOverview.mapEmbed}
                className="h-full w-full"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {footerColumns.map(column => (
            <div key={column.title}>
              <h3 className="text-sm font-extrabold uppercase text-slate-950">{column.title}</h3>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                {column.links.map(link => {
                  const external = isExternalHref(link.href);
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="transition hover:text-[#059669]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <p className="text-sm font-extrabold uppercase text-slate-950">Services inclus</p>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              {storeOverview.services.map(service => (
                <li key={service.title} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F97316]" />
                  <span>{service.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0)+6rem)] pt-5 text-xs font-semibold text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-6">
          <span>&copy; {new Date().getFullYear()} AfricaPhone. Tous droits reserves.</span>
          <div className="flex flex-wrap gap-4">
            {footerLegal.map(item => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#059669]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-extrabold leading-5 text-slate-950">{value}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7.25 4.75 9.4 4a1.5 1.5 0 0 1 1.86.8l.98 2.17a1.5 1.5 0 0 1-.39 1.75l-1.16 1.02a10.8 10.8 0 0 0 4.57 4.57l1.02-1.16a1.5 1.5 0 0 1 1.75-.39l2.17.98a1.5 1.5 0 0 1 .8 1.86l-.75 2.15a2.25 2.25 0 0 1-2.35 1.5C10.06 18.63 4.37 12.94 3.25 5.1a2.25 2.25 0 0 1 1.5-2.35Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
