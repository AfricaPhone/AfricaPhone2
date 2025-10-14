import Image from "next/image";
import Link from "next/link";
import ProductGridSection from "@/components/ProductGridSection";
import type { ServiceHighlight } from "@/data/storefront";
import {
  footerColumns,
  footerLegal,
  predictionCard,
  serviceHighlights,
  spotlights,
  voteContestCard,
} from "@/data/storefront";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-[0.2rem] pb-20 pt-10 sm:px-4 lg:px-8">
        <ProductGridSection />
        <SpotlightSection />
        <EngagementSection />
        <ServicesSection />
      </main>
      <Footer />
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white text-slate-900 shadow-sm shadow-slate-900/10">
      <TopNav />
    </header>
  );
}

function TopNav() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 lg:px-8">
      <Link
        href="/"
        className="flex items-center gap-2 whitespace-nowrap text-xl font-extrabold tracking-tight text-slate-900"
      >
        <Image
          src="/logo.png"
          alt="Logo AfricaPhone"
          width={40}
          height={40}
          priority
          className="h-10 w-10 rounded-lg shadow-sm shadow-orange-500/30"
        />
        <span>
          Africa<span className="text-orange-400">Phone</span>
        </span>
      </Link>

      <form className="order-3 w-full flex-1 min-w-[220px] sm:order-none sm:max-w-xl">
        <div className="flex h-11 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-900 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
          <input
            type="search"
            placeholder="Rechercher un produit, une marque ou un service AfricaPhone"
            className="h-full flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="flex h-full w-11 items-center justify-center bg-orange-500 text-white transition hover:bg-orange-600"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <a
          href="tel:+2290154151522"
          className="flex items-center gap-2 rounded-full border border-transparent bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-900 hover:bg-white hover:text-slate-900"
        >
          <PhoneIcon className="h-4 w-4" />
          <span className="hidden sm:inline">01 54 15 15 22</span>
        </a>
        <Link
          href="#cart"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-orange-400 hover:text-orange-500"
        >
          <CartIcon className="h-5 w-5 text-orange-500" />
          <span className="hidden sm:inline">Panier</span>
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">0</span>
        </Link>
      </div>
    </div>
  );
}

function SpotlightSection() {
  return (
    <section id="collections" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Univers marques</h2>
          <p className="text-sm text-slate-600">Retrouvez les experiences boutiques les plus immersives.</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {spotlights.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-lg shadow-slate-900/10"
          >
            <Image
              src={item.image}
              alt={item.title}
              width={960}
              height={540}
              className="h-64 w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-white">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="text-sm text-slate-200">{item.description}</p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-200">
                Decouvrir
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EngagementSection() {
  return (
    <section id="engagements" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Jeux & communautes AfricaPhone</h2>
          <p className="text-sm text-slate-600">Participez a nos animations et repartez avec des cadeaux garantis.</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementCard id="vote" {...voteContestCard} />
        <EngagementCard id="pronostic" {...predictionCard} />
      </div>
    </section>
  );
}

type EngagementCardProps = {
  id: string;
  tag: string;
  title: string;
  description: string;
  bullets: readonly string[];
  cta: { label: string; href: string };
  image: string;
};

function EngagementCard({ id, tag, title, description, bullets, cta, image }: EngagementCardProps) {
  return (
    <article
      id={id}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
    >
      <div className="absolute inset-0">
        <Image src={image} alt={title} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/75 to-slate-900/40" />
      </div>
      <div className="relative flex h-full flex-col gap-4 p-8 text-white">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {tag}
        </span>
        <h3 className="text-2xl font-semibold leading-tight">{title}</h3>
        <p className="text-sm text-slate-100">{description}</p>
        <ul className="mt-2 grid gap-2 text-sm text-slate-200">
          {bullets.map(item => (
            <li key={item} className="flex items-start gap-2">
              <CheckIcon className="mt-1 h-4 w-4 text-emerald-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href={cta.href}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-orange-100"
        >
          {cta.label}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Services premium inclus</h2>
          <p className="text-sm text-slate-600">Profitez de nos engagements boutiques sur chaque commande web.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {serviceHighlights.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: ServiceHighlight }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        {service.icon === "delivery" ? (
          <DeliveryIcon className="h-6 w-6" />
        ) : service.icon === "setup" ? (
          <SetupIcon className="h-6 w-6" />
        ) : service.icon === "finance" ? (
          <FinanceIcon className="h-6 w-6" />
        ) : (
          <SupportIcon className="h-6 w-6" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
      <p className="text-sm text-slate-600">{service.description}</p>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-12 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex-1 space-y-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg text-slate-900">
              AP
            </span>
            Africa<span className="text-orange-400">Phone</span>
          </Link>
          <p className="text-sm text-slate-400">
            Catalogues verifies, stocks physiques et experts passionnes pour vous accompagner avant et apres votre
            achat.
          </p>
          <a href="tel:+2290154151522" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-200">
            <PhoneIcon className="h-5 w-5" />
            01 54 15 15 22
          </a>
        </div>
        <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.5 15.417c3.25 0 5.917-2.667 5.917-5.917C15.417 6.25 12.75 3.583 9.5 3.583 6.25 3.583 3.583 6.25 3.583 9.5 3.583 12.75 6.25 15.417 9.5 15.417Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.167 14.167 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5.5 6h-.75c-.62 0-1.12.5-1.12 1.12v.01c0 .62.5 1.12 1.12 1.12h.96l2.02 8.44a1.12 1.12 0 0 0 1.09.85h8.11a1.12 1.12 0 0 0 1.07-.79l2.11-6.77a.56.56 0 0 0-.54-.72H8.84"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 21Z" fill="currentColor" />
      <path d="M17 21a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 17 21Z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m4.75 10.5 3.25 3.25 7.25-7.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="m10.5 5 5 5-5 5M15 10H5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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

function SetupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 4.5H17c1.1 0 2 .9 2 2V17.5c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6.5c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 15h5M9.5 10h5M12 7.5v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FinanceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.75" y="6.75" width="16.5" height="10.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 10.5h5.25M6 13.5h3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="13.5" y="12" width="4.5" height="3" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4.5a7.5 7.5 0 0 0-7.5 7.5v2.25a2.25 2.25 0 0 0 2.25 2.25H9V12H6v-0.06C6.17 7.98 8.77 5.25 12 5.25c3.23 0 5.83 2.73 6 6.69V12h-3v4.5h2.25a2.25 2.25 0 0 0 2.25-2.25V12A7.5 7.5 0 0 0 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 17.25v2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75v10.5A2.25 2.25 0 0 1 15.75 19.5h-7.5A2.25 2.25 0 0 1 6 17.25V6.75A2.25 2.25 0 0 1 8.25 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 7.5h6M9 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14.25a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" fill="currentColor" />
    </svg>
  );
}
