'use client';

import Link from 'next/link';

type KkiapayInstructionModalProps = {
  tone: 'pending' | 'success';
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function KkiapayInstructionModal({
  tone,
  eyebrow,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryHref,
  secondaryLabel,
}: KkiapayInstructionModalProps) {
  const isSuccess = tone === 'success';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kkiapay-instruction-title"
      className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-950/25">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black text-white ${
            isSuccess ? 'bg-[#059669]' : 'bg-[#F97316]'
          }`}
        >
          {isSuccess ? 'OK' : 'PIN'}
        </div>
        <p className={`mt-4 text-xs font-extrabold uppercase ${isSuccess ? 'text-[#059669]' : 'text-orange-700'}`}>
          {eyebrow}
        </p>
        <h3 id="kkiapay-instruction-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onPrimary}
            className={`flex h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white transition ${
              isSuccess ? 'bg-[#059669] hover:bg-[#047857]' : 'bg-[#F97316] hover:bg-[#EA580C]'
            }`}
          >
            {primaryLabel}
          </button>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="flex h-12 items-center justify-center rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] text-sm font-extrabold text-[#059669]"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
