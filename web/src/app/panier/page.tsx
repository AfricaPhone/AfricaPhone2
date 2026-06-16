'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  clearCart,
  type CartItem,
  removeCartItem,
  subscribeToCart,
  updateCartItemQty,
} from '@/lib/cart';
import { formatPrice } from '@/utils/formatPrice';

const WHATSAPP_NUMBER = '2290152921586';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => subscribeToCart(setItems), []);

  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price * item.qty : 0), 0),
    [items]
  );
  const hasUnknownPrice = items.some(item => typeof item.price !== 'number');

  const whatsappMessage = useMemo(() => {
    const lines = [
      'Bonjour AfricaPhone, voici ma selection :',
      '',
      ...items.map(item => {
        const price = typeof item.price === 'number' ? formatPrice(item.price) : 'Prix a confirmer';
        return `- ${item.name} x${item.qty} (${price})`;
      }),
      '',
      `Total indicatif : ${formatPrice(totalPrice)}`,
    ];

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }, [items, totalPrice]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            AfricaPhone
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#059669]/40 hover:text-[#059669]"
          >
            Catalogue
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-xs font-bold uppercase text-[#059669]">Panier</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Ma selection</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Les articles choisis depuis le catalogue apparaissent ici avec leurs quantites.
          </p>
        </section>

        {items.length === 0 ? (
          <section className="flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <CartIcon className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold">Votre panier est vide</h2>
            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
              Choisissez des produits dans le catalogue pour preparer votre selection.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-[#059669] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#047857]"
            >
              Voir le catalogue
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <section className="space-y-3">
              {items.map(item => (
                <article
                  key={item.id}
                  className="grid grid-cols-[88px_1fr_auto] gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70"
                >
                  <div className="relative h-24 overflow-hidden rounded-2xl bg-slate-100">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <CartIcon className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-sm font-extrabold text-slate-950">{item.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.tagline}</p>
                    <p className="mt-2 text-sm font-extrabold text-[#059669]">{formatPrice(item.price)}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Sous-total : {formatPrice(typeof item.price === 'number' ? item.price * item.qty : null)}
                    </p>
                    <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateCartItemQty(item.id, item.qty - 1)}
                        className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600"
                        aria-label={`Reduire la quantite de ${item.name}`}
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-extrabold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItemQty(item.id, item.qty + 1)}
                        className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600"
                        aria-label={`Augmenter la quantite de ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartItem(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Retirer ${item.name}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
              <h2 className="text-lg font-extrabold">Resume</h2>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Quantite totale</span>
                  <span className="text-slate-950">{totalQty} article(s)</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span>Total indicatif</span>
                  <span className="text-lg font-extrabold text-[#059669]">{formatPrice(totalPrice)}</span>
                </div>
                {hasUnknownPrice ? (
                  <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    Certains prix seront confirmes par AfricaPhone.
                  </p>
                ) : null}
              </div>

              <Link
                href="/checkout"
                className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-[#F97316] text-sm font-extrabold text-white transition hover:bg-[#EA580C]"
              >
                Choisir paiement et reception
              </Link>
              <a
                href={whatsappMessage}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-11 items-center justify-center rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] text-sm font-extrabold text-[#059669] transition hover:border-[#059669]/40"
              >
                Envoyer sur WhatsApp
              </a>
              <button
                type="button"
                onClick={clearCart}
                className="mt-3 h-11 w-full rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Vider le panier
              </button>
            </aside>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.5L21 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21h.01M18 21h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
