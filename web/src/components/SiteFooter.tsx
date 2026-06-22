'use client';

import Image from 'next/image';
import Link from 'next/link';
import { footerColumns, footerLegal } from '@/data/storefront';
import { storeOverview } from '@/data/nousTrouver';

const isExternalHref = (href: string) => href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
const phoneHref = `tel:${storeOverview.contact.phone.replace(/[^\d+]/g, '')}`;
const locationTitle = storeOverview.address.split(',')[0] || 'Boutique AfricaPhone';

export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[0.92fr_1.08fr] lg:gap-4">
          <section className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-slate-950/20 sm:gap-4 sm:rounded-[24px] sm:p-6">
            <div className="space-y-2.5 sm:space-y-3">
              <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-lg font-black tracking-tight sm:gap-3 sm:text-2xl">
                <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-white sm:h-12 sm:w-12">
                  <Image src="/logo.png" alt="Logo AfricaPhone" fill className="object-contain p-1" sizes="48px" />
                </span>
                <span className="min-w-0 truncate">
                  Africa<span className="text-[#10B981]">Phone</span>
                </span>
              </Link>

              <div className="space-y-1.5 text-[11px] font-semibold leading-4 text-slate-300 sm:text-sm sm:leading-6">
                <p className="line-clamp-3">{storeOverview.address}</p>
                <p className="line-clamp-2">{storeOverview.contactLine}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Link
                href={phoneHref}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#10B981] px-2 text-[11px] font-extrabold text-slate-950 transition hover:bg-[#34D399] sm:h-11 sm:px-5 sm:text-sm"
              >
                Appeler
              </Link>
              <Link
                href={storeOverview.contact.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#F97316] px-2 text-[11px] font-extrabold text-white transition hover:bg-[#EA580C] sm:h-11 sm:px-5 sm:text-sm"
              >
                WhatsApp
              </Link>
              <Link
                href={storeOverview.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-full border border-white/15 px-2 text-[11px] font-extrabold text-white transition hover:border-[#10B981]/60 hover:text-[#10B981] sm:h-11 sm:px-5 sm:text-sm"
              >
                Itineraire
              </Link>
            </div>

            <div className="hidden grid-cols-2 gap-2 sm:grid">
              {storeOverview.openingHours.map(item => (
                <div key={item.label} className="rounded-2xl bg-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-xs font-extrabold uppercase text-[#10B981]">{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-white sm:text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-slate-950/20 sm:rounded-[24px]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-[#10B981] sm:text-xs">Showroom</p>
                <h2 className="truncate text-sm font-black text-white sm:text-lg">{locationTitle}</h2>
              </div>
              <Link
                href={storeOverview.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-slate-950 transition hover:bg-[#10B981] sm:px-3 sm:py-2 sm:text-xs"
              >
                Maps
              </Link>
            </div>
            <div className="h-[150px] bg-slate-200 sm:h-[280px] lg:h-full lg:min-h-[320px]">
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
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 lg:grid-cols-3">
          {footerColumns.map(column => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-xs font-black uppercase text-white">{column.title}</h3>
              <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-400 sm:text-sm">
                {column.links.map(link => {
                  const external = isExternalHref(link.href);
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="transition hover:text-[#10B981]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0)+5.5rem)] pt-4 text-xs font-semibold text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-5">
          <span>&copy; {new Date().getFullYear()} AfricaPhone. Tous droits reserves.</span>
          <div className="flex flex-wrap gap-4">
            {footerLegal.map(item => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#10B981]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
