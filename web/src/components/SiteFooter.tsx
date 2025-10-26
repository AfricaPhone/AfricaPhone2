'use client';

import Link from 'next/link';
import { footerColumns, footerLegal } from '@/data/storefront';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-12 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center lg:max-w-none lg:flex-1 lg:items-start lg:text-left">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-2xl font-bold text-white lg:justify-start"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg text-slate-900">
              AP
            </span>
            Africa<span className="text-orange-400">Phone</span>
          </Link>
          <p className="text-sm text-slate-400">
            Catalogues verifies, stocks physiques et experts passionnes pour vous accompagner avant et apres votre achat.
          </p>
          <a
            href="tel:+2290154151522"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-orange-200"
          >
            <PhoneIcon className="h-5 w-5" />
            01 54 15 15 22
          </a>
        </div>
        <div className="grid w-full gap-8 sm:grid-cols-2 lg:flex-1 lg:grid-cols-3">
          {footerColumns.map(column => (
            <div key={column.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{column.title}</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {column.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-orange-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between lg:px-8">
          <span>&copy; {new Date().getFullYear()} AfricaPhone. Tous droits reserves.</span>
          <div className="flex flex-wrap justify-center gap-4">
            {footerLegal.map(item => (
              <Link key={item.label} href={item.href} className="hover:text-orange-200">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.32 2H7.5a2 2 0 0 1 2 1.72 12.3 12.3 0 0 0 .67 2.71 2 2 0 0 1-.45 2.11l-1.07 1.07a16 16 0 0 0 6 6l1.07-1.07a2 2 0 0 1 2.11-.45 12.3 12.3 0 0 0 2.71.67A2 2 0 0 1 22 16.92Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
