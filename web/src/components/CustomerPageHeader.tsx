'use client';

import Link from 'next/link';

type CustomerPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export default function CustomerPageHeader({ eyebrow, title, description }: CustomerPageHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Africa<span className="text-[#059669]">Phone</span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#059669]/40 hover:text-[#059669]"
          >
            Catalogue
          </Link>
        </div>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase text-[#059669]">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        </div>
        {description ? <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
      </section>
    </>
  );
}
