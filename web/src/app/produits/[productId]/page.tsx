import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Header, Footer } from "../../page";
import { getProductDetail } from "@/data/product-details";

type ProductDetailPageProps = {
  params: { productId: string };
};

export function generateMetadata({ params }: ProductDetailPageProps): Metadata {
  const product = getProductDetail(params.productId);

  if (!product) {
    return {
      title: "Produit non trouvé | AfricaPhone",
      description: "Ce produit n'est plus disponible dans le catalogue AfricaPhone.",
    };
  }

  return {
    title: `${product.name} | AfricaPhone`,
    description: product.description,
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = getProductDetail(params.productId);

  if (!product) {
    notFound();
  }

  const message = `Bonjour AfricaPhone, je suis intéressé(e) par ${product.name} (${product.price}). Est-il disponible en stock ?`;
  const whatsappHref = `https://wa.me/2290154151522?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-[0.2rem] pb-16 pt-10 sm:px-4 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Accueil
          </Link>
          <span>/</span>
          <Link href="/" className="transition hover:text-slate-900">
            Catalogue
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <section aria-label="Galerie produit" className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={product.gallery[0]}
                  alt={`${product.name} vue principale`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {product.gallery.slice(1).map((image, index) => (
                <div
                  key={`${product.id}-gallery-${index}`}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <Image
                    src={image}
                    alt={`${product.name} visuel ${index + 2}`}
                    fill
                    sizes="(max-width: 640px) 25vw, 15vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {product.badge ?? "Selection boutique"}
                </span>
                {product.rating ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                    <StarIcon className="h-4 w-4 text-amber-400" />
                    {product.rating.toFixed(1)}
                    {product.reviews ? (
                      <span className="text-xs text-slate-400">({product.reviews})</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{product.name}</h1>
                <p className="text-sm text-slate-600 sm:text-base">{product.tagline}</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-rose-600">{product.price}</p>
                {product.oldPrice ? (
                  <p className="text-sm text-slate-400 line-through">{product.oldPrice}</p>
                ) : null}
              </div>
              <p className="text-sm text-slate-600">{product.description}</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {product.highlights.map(highlight => (
                  <li key={highlight} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
              >
                Discuter sur WhatsApp
              </Link>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                Un conseiller AfricaPhone vous répond en moins de 5 minutes (lun.-sam. 9h-21h).
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <h2 className="text-lg font-semibold text-slate-900">Livraison & services inclus</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {product.deliveryNotes.map(note => (
                  <li key={note} className="flex items-start gap-2">
                    <DeliveryIcon className="mt-0.5 h-4 w-4 text-rose-500" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <section aria-labelledby="fiche-technique" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="fiche-technique" className="text-xl font-semibold text-slate-900">
                Fiche technique & accompagnement boutique
              </h2>
              <p className="text-sm text-slate-600">
                Nos experts préparent chaque appareil avant expédition pour une expérience prête à l’usage.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <dl className="grid gap-4 sm:grid-cols-2">
              {product.specs.map(spec => (
                <div key={`${product.id}-${spec.label}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{spec.label}</dt>
                  <dd className="mt-1 text-sm text-slate-800">{spec.value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3">
              {product.services.map(service => (
                <div
                  key={`${product.id}-${service.title}`}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                >
                  <p className="text-sm font-semibold text-emerald-800">{service.title}</p>
                  <p className="mt-1 text-sm text-emerald-700">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="support-whatsapp" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="support-whatsapp" className="text-xl font-semibold text-slate-900">
                Besoin d’un avis avant de confirmer ?
              </h2>
              <p className="text-sm text-slate-600">
                Envoyez-nous une photo de votre ancien appareil ou posez vos questions, nous vous recommandons la meilleure configuration.
              </p>
            </div>
            <Link
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
            >
              <WhatsappIcon className="h-5 w-5 text-white" />
              Contacter AfricaPhone
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m4.75 10.5 3.25 3.25 7.25-7.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="m10 2.75 1.93 3.91 4.32.63-3.12 3.04.74 4.29L10 12.93l-3.87 2.05.74-4.29-3.12-3.04 4.32-.63L10 2.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeliveryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4.5 7.5h10.5V16H6a1.5 1.5 0 0 1-1.5-1.5V7.5Zm10.5 0h2.67c.3 0 .58.13.78.36l2.55 2.94c.17.2.26.45.26.71V16h-6.26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.25 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 3c-7.18 0-13 5.65-13 12.61 0 2.2.63 4.27 1.74 6.06L3 29l7.51-2.44A13.73 13.73 0 0 0 16 27.22c7.18 0 13-5.65 13-12.61C29 8.65 23.18 3 16 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.83 9.92c-.3-.43-.62-.43-.9-.43h-.76c-.27 0-.71.1-1.07.52-.37.41-1.4 1.37-1.4 3.33 0 1.96 1.44 3.86 1.64 4.13.2.27 2.72 4.3 6.64 5.86 3.28 1.29 3.95 1.03 4.66.96.71-.07 2.29-.93 2.61-1.83.32-.9.32-1.67.23-1.83-.09-.16-.34-.25-.71-.45-.37-.2-2.29-1.13-2.65-1.26-.35-.13-.61-.2-.87.2-.26.41-1 1.26-1.23 1.52-.23.27-.45.3-.82.11-.37-.2-1.56-.61-2.97-1.95-1.1-1.04-1.84-2.32-2.06-2.72-.21-.41-.02-.62.16-.82.16-.16.37-.41.55-.61.18-.2.23-.34.35-.57.12-.23.06-.43-.03-.62-.09-.2-.77-1.91-1.09-2.63Z"
        fill="currentColor"
      />
    </svg>
  );
}
