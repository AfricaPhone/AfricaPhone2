'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  allProducts,
  brandHighlights,
  brandNarrative,
  heroContent,
  insightCards,
  productCollections,
  productSegments,
  promoCards,
  type HeroLink,
} from "@/data/home";
import Carousel from "@/components/Carousel";

const NAV_LINKS = [
  { label: "Catalogue", href: "#catalogue" },
  { label: "Collections", href: "#collections" },
  { label: "Services", href: "#services" },
  { label: "Financement", href: "#finance" },
  { label: "Communauté", href: "#community" },
  { label: "Engagement", href: "#narrative" },
  { label: "Contact", href: "#contact" },
] as const;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1510552776732-01acc9a4cbd0?auto=format&fit=crop&w=1600&q=80";

const COMMUNITY_STORIES = [
  {
    name: "Sonia, Photographe",
    message:
      "“AfricaPhone m’a guidée vers un Galaxy ultra adapté à mon travail. Un service premium et un suivi WhatsApp réactif !”",
  },
  {
    name: "Brice, Ambassadeur",
    message:
      "“Grâce au programme ambassadeur, je partage mes bons plans et j’accède à des avantages exclusifs chaque mois.”",
  },
  {
    name: "Linda, Entrepreneure",
    message:
      "“Le paiement fractionné Kkiapay m’a permis d’équiper mon équipe sans bloquer ma trésorerie.”",
  },
] as const;

export default function MarketingPage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <Header />
      <main>
        <HeroSection />
        <PromoStrip />
        <BrandHighlightsSection />
        <CollectionsSection />
        <SegmentsSection />
        <ServicesSection />
        <FinanceSection />
        <CommunitySection />
        <NarrativeSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/70 backdrop-blur transition-shadow ${
        scrolled ? "shadow-lg shadow-slate-900/10" : "shadow-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">AP</span>
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
          <Link
            href="#contact"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            FR · EN
          </Link>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
          >
            Télécharger l’app
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const ctas = [heroContent.primaryCta, heroContent.secondaryCta, heroContent.tertiaryCta] as HeroLink[];
  return (
    <section
      id="hero"
      className="relative flex min-h-[60vh] items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 text-white md:min-h-[90vh]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.25),_transparent_60%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:gap-20 lg:px-8">
        <div className="max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
            {heroContent.tag}
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">{heroContent.title}</h1>
          <p className="text-base text-slate-200 sm:text-lg">{heroContent.description}</p>
          <div className="flex flex-wrap gap-3">
            {ctas.map(cta => (
              <HeroButton key={cta.label} cta={cta} />
            ))}
          </div>
        </div>
        <div className="relative h-80 w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur">
          <Image
            src={HERO_IMAGE}
            alt="AfricaPhone hero"
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

function PromoStrip() {
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
              className="relative min-w-[260px] overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg"
            >
              <div className="absolute inset-0">
                <Image src={card.image} alt={card.title} fill sizes="260px" className="object-cover opacity-30" />
              </div>
              <div className="relative flex h-full flex-col justify-between p-6">
                <div className="space-y-2">
                  {card.badge ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {card.badge}
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <p className="text-sm text-white/80">{card.description}</p>
                </div>
                <Link
                  href={card.cta.href}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-orange-100"
                >
                  {card.cta.label}
                  <ArrowIcon className="text-sm" />
                </Link>
              </div>
            </article>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

function BrandHighlightsSection() {
  return (
    <section id="brands" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Univers partenaires AfricaPhone</h2>
            <p className="text-sm text-slate-500">
              Des marques sélectionnées pour leur innovation, leur fiabilité et notre capacité à les accompagner localement.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {brandHighlights.map(brand => (
            <article
              key={brand.id}
              className={`flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br ${brand.background} p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
                  <Image src={brand.logoUrl} alt={brand.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{brand.name}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{brand.tagline}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{brand.description}</p>
              <Link
                href={brand.cta.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900"
              >
                {brand.cta.label}
                <ArrowIcon />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CollectionsSection() {
  return (
    <section id="collections" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Collections premium à ne pas manquer</h2>
            <p className="text-sm text-slate-500">
              Nos conseillers sélectionnent chaque semaine des configurations prêtes à inspirer vos projets.
            </p>
          </div>
        </div>
        <div className="mt-8 space-y-10">
          {productCollections.map(collection => (
            <div key={collection.id} className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{collection.title}</h3>
                  <p className="text-sm text-slate-500">{collection.description}</p>
                </div>
                <Link
                  href={collection.cta.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  {collection.cta.label}
                  <ArrowIcon />
                </Link>
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
    () => allProducts.filter(product => product.segment === activeSegment).slice(0, 6),
    [activeSegment]
  );

  if (segmentProducts.length === 0) {
    return null;
  }

  return (
    <section id="segments" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Explorez nos univers</h2>
            <p className="text-sm text-slate-500">Populaires, tablettes ou accessoires : trouvez votre prochain compagnon mobile.</p>
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
                  isActive ? "bg-slate-900 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.segment}</div>
                <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">{product.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <p className="text-sm font-semibold text-orange-500">{product.price}</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition hover:text-slate-900"
                  >
                    Voir plus
                    <ArrowIcon />
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
    <section id="services" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Pourquoi AfricaPhone ?</h2>
            <p className="text-sm text-slate-500">
              Une équipe de proximité, un accompagnement premium et un focus sur la satisfaction long terme.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {insightCards.map(card => (
            <article
              key={card.id}
              className="flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-500">AfricaPhone Care</div>
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-600">{card.description}</p>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preuve</p>
                <p className="text-sm text-slate-600">{card.proof}</p>
              </div>
              <div className="rounded-2xl bg-orange-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Bénéfice</p>
                <p className="text-sm text-orange-600">{card.benefit}</p>
              </div>
              <Link
                href={card.cta.href}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
              >
                {card.cta.label}
                <ArrowIcon />
              </Link>
            </article>
          ))}
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
            <h2 className="text-3xl font-bold">Financement flexible avec Kkiapay</h2>
            <p className="text-sm text-slate-300">
              Payez en 3 à 6 fois, obtenez une réponse instantanée et profitez d’un accompagnement dédié.
            </p>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Démarrer une simulation
            <ArrowIcon />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Paiement fractionné",
              description: "Réglez en plusieurs fois sans tracer votre trésorerie grâce à notre partenaire Kkiapay.",
            },
            {
              title: "Simulation instantanée",
              description: "Obtenez votre accord en moins de 3 minutes, en boutique ou en ligne.",
            },
            {
              title: "Contrats limpides",
              description: "Aucun frais caché, rappel automatique et assistance personnalisée à chaque étape.",
            },
          ].map(item => (
            <article
              key={item.title}
              className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur transition hover:bg-white/10"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-slate-200">{item.description}</p>
            </article>
          ))}
          <article className="flex h-full flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-100">
                Offre premium
              </span>
              <h3 className="text-xl font-semibold text-white">Kkiapay x AfricaPhone</h3>
              <p className="text-sm text-white/90">
                Un conseiller vous accompagne pour choisir la formule la plus adaptée à votre budget et planifier vos livraisons.
              </p>
            </div>
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              Prendre rendez-vous vidéo
              <ArrowIcon />
            </Link>
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
            <h2 className="text-3xl font-bold text-slate-900">La communauté AfricaPhone</h2>
            <p className="text-sm text-slate-500">
              Ambassadeurs, créateurs et entrepreneurs partagent leurs inspirations et bénéficient d’avantages exclusifs.
            </p>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Rejoindre le programme
            <ArrowIcon />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
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
                  <p className="text-xs text-slate-500">Ambassadeur AfricaPhone</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function NarrativeSection() {
  return (
    <section id="narrative" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{brandNarrative.title}</h2>
            <p className="text-sm text-slate-500">{brandNarrative.subtitle}</p>
          </div>
          <Link
            href={brandNarrative.cta.href}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
          >
            {brandNarrative.cta.label}
            <ArrowIcon />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {brandNarrative.steps.map(step => (
            <article
              key={step.id}
              className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Étape {brandNarrative.steps.indexOf(step) + 1}
              </span>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preuve</p>
                <p className="text-sm text-slate-600">{step.proof}</p>
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
            <p className="text-sm text-slate-300">News produits, avant-premières et offres réservées à notre communauté.</p>
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              S’inscrire
              <ArrowIcon />
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900">AP</span>
            AfricaPhone
          </Link>
          <p className="text-sm text-slate-300">
            AfricaPhone accompagne les passionnés du mobile partout au Bénin avec des conseils premium, un financement flexible et un suivi long terme.
          </p>
          <div className="flex gap-3">
            <Link
              href="https://apple.com/app-store"
              className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <span className="text-lg"></span>
              App Store
            </Link>
            <Link
              href="https://play.google.com/store"
              className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <span className="text-lg">▶</span>
              Play Store
            </Link>
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
              Conditions générales
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function HeroButton({ cta }: { cta: HeroLink }) {
  const primary = cta === heroContent.primaryCta;
  return (
    <Link
      href={cta.href}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
        primary
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
          : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {cta.label}
      <ArrowIcon />
    </Link>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={className ?? "h-3 w-3"}>
      <path
        d="M3.75 9h10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m9.75 5.25 4.5 3.75-4.5 3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
