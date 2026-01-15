'use client';

import Image from 'next/image';

export default function MaintenanceBanner() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="mx-4 max-w-lg rounded-3xl border border-orange-500/30 bg-slate-800/80 p-8 text-center shadow-2xl backdrop-blur-sm">
                <div className="mb-6 flex justify-center">
                    <Image
                        src="/logo.png"
                        alt="Logo AfricaPhone"
                        width={80}
                        height={80}
                        priority
                        className="rounded-2xl shadow-lg shadow-orange-500/30"
                    />
                </div>
                <h1 className="mb-4 text-2xl font-bold text-white">
                    Site en maintenance
                </h1>
                <p className="mb-6 text-slate-300">
                    Notre site est temporairement indisponible pour une mise à jour technique.
                    Nous travaillons pour rétablir le service dans les plus brefs délais.
                </p>
                <p className="mb-6 text-slate-400 text-sm">
                    Veuillez nous excuser pour la gêne occasionnée.
                </p>
                <a
                    href="https://wa.me/2290152921586"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1EBE5D]"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                        <path d="M12 .5A11.5 11.5 0 002.2 18.8L.5 23.5l4.8-1.7A11.5 11.5 0 1012 .5zm6.6 16.4c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.3.1-2.1-.1a19 19 0 01-3.3-1.2 11.5 11.5 0 01-3.6-2.9 6.5 6.5 0 01-1.4-2.3c-.1-.6-.1-1.1.2-1.5.2-.4.5-.6.9-.9l.2-.1c.3-.2.5-.2.6 0l.4.6c.1.2.3.4.4.6.2.4.1.6 0 .8l-.2.3c-.1.1-.1.2 0 .3a7 7 0 001.8 2.2 7 7 0 002.5 1.4c.1 0 .2 0 .3-.1l.5-.6c.2-.2.4-.2.7-.1l.8.4.6.3c.1.1.2.1.3.2.1.2 0 .4 0 .6z" />
                    </svg>
                    Nous contacter sur WhatsApp
                </a>
            </div>
        </div>
    );
}
