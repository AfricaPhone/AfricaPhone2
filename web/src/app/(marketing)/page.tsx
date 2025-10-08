'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  allProducts,
  heroContent,
  insightCards,
  productCollections,
  productSegments,
  promoCards,
} from "@/data/home";
import Carousel from "@/components/Carousel";

const NAV_LINKS = [
  { label: "Catalogue", href: "#catalogue" },
  { label: "Collections", href: "#collections" },
  { label: "Services", href: "#services" },
  { label: "Financement", href: "#finance" },
  { label: "Communauté", href: "#community" },
  { label: "Contact", href: "#contact" },
] as const;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=1600&q=80";

const FINANCE_HIGHLIGHTS = [
  {
    title: "Paiement fractionné",
    description: "Étalez vos achats jusqu’à 6 fois avec la solution Kkiapay approuvée AfricaPhone.",
    icon: "calendar-outline" as const,
  },
  {
    title: "Simulation instantanée",
    description: "Obtenez un accord en moins de 3 minutes depuis votre smartphone ou en boutique.",
    icon: "flash-outline" as const,
  },
  {
    title: "Zéro frais caché",
    description: "Contrats transparents, accompagnement dédié et rappel avant chaque échéance.",
    icon: "shield-checkmark-outline" as const,
  },
];

const COMMUNITY_STORIES = [
  {
    name: "Sonia, Photographe",
    message:
      "“AfricaPhone m’a aidée à choisir un Samsung adapté à mon travail. Service premium et suivi WhatsApp réactif !”",
  },
  {
    name: "Brice, Ambassadeur",
    message:
      "“Grâce au programme ambassadeur, je partage mes bons plans et je gagne des avantages exclusifs chaque mois.”",
  },
  {
    name: "Linda, Entrepreneure",
    message:
      "“Le paiement fractionné Kkiapay m’a permis d’équiper mon équipe sans bloquer ma trésorerie.”",
  },
  {
    name: "Samuel, Étudiant",
    message:
      "“Livraison rapide à Porto-Novo et configuration Express : j’ai pu reprendre les cours aussitôt.”",
  },
] as const;

export default function MarketingLanding() {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <Header />
      <main>
        <HeroSection />
        <PromoStrips />
        <CollectionsSection />
        <SegmentsSection />
        <ServicesSection />
        <FinanceSection />
        <CommunitySection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/70 backdrop-blur transition-shadow ${
        scrolled ? "shadow-lg" : "shadow-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 transition-all lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
            AP
          </span>
          <span className="hidden sm:block">
            Africa<span className="text-orange-500">Phone</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          {NAV_LINKS.map(link => (
            <Link key={link.label} href={link.href} className="rounded-full px-3 py-1 transition hover:bg-slate-100">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:flex"
          >
            <IonIcon name="language-outline" />
            FR
          </button>
          <Link
            href="#contact"
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
          >
            Télécharger l’app
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[55vh] items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white md:min-h-[90vh]"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.3),_transparent_55%)]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-16 lg:flex-row lg:items-center lg:gap-20 lg:px-8">
        <div className="max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
            {heroContent.tag}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {heroContent.title}
          </h1>
          <p className="text-base text-slate-200 sm:text-lg">{heroContent.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={heroContent.primaryCta.href ?? "#catalogue"}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              {heroContent.primaryCta.label}
              <IonIcon name="arrow-forward" className="text-base" />
            </Link>
            <Link
              href={heroContent.secondaryCta.href ?? "#services"}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {heroContent.secondaryCta.label}
              <IonIcon name="play-circle-outline" className="text-base" />
            </Link>
          </div>
        </div>
        <div className="relative h-80 w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur">
          <Image
            src={HERO_IMAGE}
            alt="AfricaPhone marketplace"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function PromoStrips() {
  if (promoCards.length === 0) {
    return null;
  }
  return (
    <section id="catalogue" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <Carousel>
          {promoCards.map(card => (
            <article
              key={card.id}
              className="relative flex min-w-[240px] flex-col justify-between overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg"
            >
              <div className="absolute inset-0">
                <Image src={card.image} alt={card.title} fill sizes="240px" className="object-cover opacity-30" />
              </div>
              <div className="relative space-y-2 p-6">
                {card.badge ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {card.badge}
                  </span>
                ) : null}
                <h3 className="text-base font-semibold">{card.title}</h3>
                <p className="text-xs text-white/80">{card.description}</p>
              </div>
              <div className="relative p-6 pt-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-orange-100"
                >
                  {card.ctaLabel}
                  <IonIcon name="arrow-forward" className="text-sm" />
                </button>
              </div>
            </article>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

function CollectionsSection() {
  return (
    <section id="collections" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Collections prisées</h2>
            <p className="text-sm text-slate-500">
              Sélectionnées par nos conseillers pour répondre aux usages du moment.
            </p>
          </div>
          <Link
            href="#catalogue"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            Parcourir le catalogue
            <IonIcon name="arrow-forward" />
          </Link>
        </div>
        <div className="mt-8 space-y-10">
          {productCollections.map(collection => (
            <div key={collection.id} className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{collection.title}</h3>
                  <p className="text-sm text-slate-500">{collection.description}</p>
                </div>
              </div>
              <Carousel>
                {collection.items.map(item => (
                  <article
                    key={item.id}
                    className="min-w-[240px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <h4 className="text-base font-semibold text-slate-900">{item.name}</h4>
                    <p className="text-sm font-semibold text-orange-500">{item.price}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.highlight}</p>
                    {item.badge ? (
                      <span className="mt-4 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-600">
                        {item.badge}
                      </span>
                    ) : null}
                  </article>
                ))}
              </Carousel>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SegmentsSection() {
  const [activeSegment, setActiveSegment] = useState<(typeof productSegments)[number]>(productSegments[0]);

  const segmentProducts = useMemo(
    () =>
      allProducts.filter(product => product.segment === activeSegment).slice(0, 6),
    [activeSegment]
  );

  if (segmentProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Explorer par univers</h2>
            <p className="text-sm text-slate-500">
              Smartphones, tablettes ou accessoires : trouvez rapidement le segment qui vous correspond.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {productSegments.map(segment => {
            const isActive = activeSegment === segment;
            return (
              <button
                key={segment}
                type="button"
                onClick={() => setActiveSegment(segment)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-slate-900 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {segment}
              </button>
            );
          })}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {segmentProducts.map(product => (
            <article
              key={product.id}
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-56 bg-slate-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <IonIcon name="pricetags-outline" />
                  {product.segment}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">{product.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <p className="text-sm font-semibold text-orange-500">{product.price}</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Voir plus
                    <IonIcon name="arrow-forward" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Services AfricaPhone</h2>
            <p className="text-sm text-slate-500">
              Une équipe de proximité et des prestations exclusives pour chaque appareil acheté.
            </p>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Prendre rendez-vous
            <IonIcon name="calendar-outline" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {insightCards.map(card => (
            <article
              key={card.id}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <IonIcon name="checkmark-circle-outline" className="text-2xl text-orange-500" />
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-500">{card.description}</p>
              <Link href={card.href} className="text-sm font-semibold text-orange-500 hover:text-orange-600">
                En savoir plus
              </Link>
            </article>
          ))}
          <article className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-100">
                Support premium
              </span>
              <h3 className="text-xl font-semibold">AfricaPhone Care+</h3>
              <p className="text-sm text-white/90">
                Extension de garantie, diagnostic express et prêt d’appareil disponibles en boutique.
              </p>
            </div>
            <Link
              href="#contact"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              Souscrire
              <IonIcon name="shield-checkmark-outline" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function FinanceSection() {
  return (
    <section id="finance" className="bg-slate-900 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Financer votre appareil en toute sérénité</h2>
            <p className="text-sm text-slate-300">
              AfricaPhone s’associe à Kkiapay pour proposer des solutions de paiement en 3 à 6 fois sans paperasse.
            </p>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Démarrer une simulation
            <IonIcon name="cash-outline" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {FINANCE_HIGHLIGHTS.map(highlight => (
            <article
              key={highlight.title}
              className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur transition hover:bg-white/10"
            >
              <IonIcon name={highlight.icon} className="text-2xl text-orange-300" />
              <h3 className="text-lg font-semibold text-white">{highlight.title}</h3>
              <p className="text-sm text-slate-200">{highlight.description}</p>
            </article>
          ))}
          <article className="flex h-full flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-100">
                Offre partenaire
              </span>
              <h3 className="text-xl font-semibold text-white">Kkiapay x AfricaPhone</h3>
              <p className="text-sm text-white/90">
                Un conseiller dédié vous accompagne pour choisir la formule la plus adaptée à votre budget.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              Prendre RDV vidéo
              <IonIcon name="videocam-outline" />
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section id="community" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Une communauté qui grandit avec vous</h2>
            <p className="text-sm text-slate-500">
              Ambassadeurs, créateurs de contenu, entrepreneurs : AfricaPhone rassemble les passionnés du mobile.
            </p>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Rejoindre le programme
            <IonIcon name="people-outline" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {COMMUNITY_STORIES.map(story => (
            <article
              key={story.name}
              className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-600">{story.message}</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {story.name
                    .split(" ")
                    .map(part => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{story.name}</p>
                  <p className="text-xs text-slate-500">Communauté AfricaPhone</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="bg-slate-900 text-slate-100">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold text-white">Restez informé des nouveautés AfricaPhone</h3>
            <p className="text-sm text-slate-300">
              News produits, promos privées et avant-premières du programme ambassadeur.
            </p>
          </div>
          <form className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="Votre adresse e-mail"
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-orange-400 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              S’inscrire
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900">
              AP
            </span>
            AfricaPhone
          </Link>
          <p className="text-sm text-slate-300">
            AfricaPhone accompagne les passionnés du mobile partout au Bénin avec des services premium et une
            communauté engagée.
          </p>
          <div className="flex gap-3">
            <StoreBadge type="ios" />
            <StoreBadge type="android" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Navigation</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {NAV_LINKS.map(link => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Téléphone : +229 61 00 00 00</li>
            <li>WhatsApp : +229 61 00 00 00</li>
            <li>Email : contact@africaphone.bj</li>
            <li>
              <Link href="#finance" className="transition hover:text-white">
                Solutions de financement
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} AfricaPhone. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/mentions-legales" className="transition hover:text-white">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite" className="transition hover:text-white">
              Politique de confidentialité
            </Link>
            <Link href="/conditions" className="transition hover:text-white">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StoreBadge({ type }: { type: "ios" | "android" }) {
  if (type === "ios") {
    return (
      <Link
        href="https://apple.com/app-store"
        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        <IonIcon name="logo-apple" className="text-lg" />
        App Store
      </Link>
    );
  }
  return (
    <Link
      href="https://play.google.com/store"
      className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
    >
      <IonIcon name="logo-google-playstore" className="text-lg" />
      Play Store
    </Link>
  );
}

type IoniconName =
  | "arrow-forward"
  | "bag-handle-outline"
  | "calendar-outline"
  | "cash-outline"
  | "checkmark-circle-outline"
  | "chevron-forward"
  | "flash-outline"
  | "language-outline"
  | "logo-apple"
  | "logo-google-playstore"
  | "notifications-outline"
  | "people-outline"
  | "play-circle-outline"
  | "pricetags-outline"
  | "shield-checkmark-outline"
  | "sparkles-outline"
  | "videocam-outline";

function IonIcon({ name, className }: { name: IoniconName; className?: string }) {
  const classes = className ? `${className}` : "h-4 w-4";
  switch (name) {
    case "arrow-forward":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path d="M5 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bag-handle-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M7 8V7a5 5 0 0 1 10 0v1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M6 8h12l1 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l1-11Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "calendar-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M7 3v4M17 3v4M3 11h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "cash-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 12a4 4 0 0 0 4 4 4 4 0 0 0 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "checkmark-circle-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chevron-forward":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flash-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="m11 3-7 12h5v6l7-12h-5V3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "language-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 12h16M12 4c2.5 2.5 3.5 5.5 3.5 8s-1 5.5-3.5 8M12 4c-2.5 2.5-3.5 5.5-3.5 8s1 5.5 3.5 8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "logo-apple":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={classes}>
          <path d="M16.5 13.4c-.02-2 1.63-2.97 1.7-3.02-0.93-1.35-2.37-1.54-2.88-1.57-1.23-.13-2.4.74-3.03.74-.63 0-1.59-.72-2.62-.7-1.35.02-2.6.78-3.3 1.98-1.41 2.45-.36 6.06 1.01 8.05.67.96 1.47 2.05 2.51 2.01 1-.04 1.38-.65 2.6-.65 1.22 0 1.56.65 2.63.63 1.08-.02 1.77-.98 2.44-1.94.77-1.13 1.09-2.23 1.1-2.28-.02-.01-2.12-.81-2.16-3.25Z" />
          <path d="M14.65 6.62c.56-.67.94-1.6.84-2.54-.81.03-1.77.53-2.34 1.2-.51.6-.97 1.57-.85 2.49.9.07 1.79-.46 2.35-1.15Z" />
        </svg>
      );
    case "logo-google-playstore":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path d="m4.5 3.5 10.7 8.5-10.7 8.5c-.3-.3-.5-.7-.5-1.2V4.7c0-.5.2-.9.5-1.2Z" fill="#34a853" />
          <path d="m18.3 9.1-3.1 2.9 3.1 2.9 3.2-1.8c.8-.5.8-1.7 0-2.2l-3.2-1.8Z" fill="#fbbc04" />
          <path d="m4.5 3.5 10.7 8.5-3.1 2.6L4.5 3.5Z" fill="#4285f4" />
          <path d="m4.5 20.5 7.6-5.9 3.1 2.6-10.7 8.5c-.3-.3-.5-.7-.5-1.2Z" fill="#ea4335" />
        </svg>
      );
    case "notifications-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M19 17H5l1.2-1.3c.5-.6.8-1.3.8-2V11c0-3 2-5.6 5-6.3V4a1 1 0 1 1 2 0v.7c2.9.7 5 3.3 5 6.3v2.7c0 .7.3 1.4.8 2L19 17Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "people-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M16 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M20 21v-1a4 4 0 0 0-3-3.87"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M17 7a3 3 0 1 1-2.18 5.09"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "play-circle-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
        </svg>
      );
    case "pricetags-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M4 7.5v5l7.5 7.5 8-8V4.5H12L4 7.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "shield-checkmark-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M12 21.5 5.5 18V6.5L12 3l6.5 3.5V18L12 21.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="m9.5 12.5 2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "sparkles-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <path
            d="M12 4.5 13.5 9h4.5l-3.75 2.6 1.3 4.4L12 13.8l-3.55 2.2 1.3-4.4L6 9h4.5L12 4.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "videocam-outline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <rect
            x="4"
            y="6"
            width="12"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M16 10.5 20 8v8l-4-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes}>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
  }
}
