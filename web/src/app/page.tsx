import Link from "next/link";
import {
  brandHighlights,
  heroContent,
  insightCards,
  productCollections,
  promoCards,
} from "@/data/home";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 pb-24 pt-12 lg:px-8">
        <HeroSection />
        <BrandShowcase />
        <PromoHighlights />
        <CollectionsSpotlight />
        <InsightsGrid />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          AfricaPhone
        </Link>
        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Link href="#catalogue" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Catalogue
          </Link>
          <Link href="#marques" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Marques
          </Link>
          <Link href="#services" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Services
          </Link>
          <Link href="#contest" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Concours
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="#prediction-game"
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:inline-flex"
          >
            Pronostics
          </Link>
          <Link
            href="#download"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
    <section id="hero" className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-8 py-16 text-white shadow-xl">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white/80">
            {heroContent.tag}
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {heroContent.title}
          </h1>
          <p className="text-base text-white/75 md:text-lg">{heroContent.description}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href={heroContent.primaryCta.href}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              {heroContent.primaryCta.label}
            </Link>
            <Link
              href={heroContent.secondaryCta.href}
              className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              {heroContent.secondaryCta.label}
            </Link>
          </div>
        </div>
        <div className="relative flex h-full flex-col justify-center">
          <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-white/70">
              <span>Populaires</span>
              <span>Cette semaine</span>
            </div>
            <div className="space-y-4 text-sm">
              {productCollections[0]?.items.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-white/70">{item.highlight}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-white/60">
              <span>+30 nouveaux produits ajoutés</span>
              <span>Catalogue mis à jour</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandShowcase() {
  return (
    <section id="marques" className="space-y-8">
      <SectionHeader
        eyebrow="Marques partenaires"
        title="Vos marques préférées, soigneusement sélectionnées."
        description="Nous travaillons directement avec les constructeurs pour garantir authenticité, garantie et disponibilité."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {brandHighlights.map(brand => (
          <article
            key={brand.id}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${brand.background} p-6 shadow-sm transition hover:shadow-md`}
          >
            <div className="flex h-full flex-col justify-between">
              <div className="space-y-2">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${brand.accentColor}1a`, color: brand.accentColor }}
                >
                  {brand.tagline}
                </span>
                <h3 className="text-2xl font-semibold text-slate-900">{brand.name}</h3>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm font-medium text-slate-600">
                <span>Voir la sélection</span>
                <span aria-hidden className="text-lg transition group-hover:translate-x-1">→</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PromoHighlights() {
  return (
    <section id="contest" className="space-y-8">
      <SectionHeader
        eyebrow="Expérience AfricaPhone"
        title="Plus que de la vente : animations, concours et services."
        description="Gardez le lien avec la communauté via les événements et services proposés sur l’application."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {promoCards.map(card => (
          <article key={card.id} className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="space-y-4">
              {card.badge && (
                <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {card.badge}
                </span>
              )}
              <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-600">{card.description}</p>
            </div>
            <Link href={card.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:gap-3">
              {card.ctaLabel}
              <span aria-hidden>→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function CollectionsSpotlight() {
  return (
    <section id="catalogue" className="space-y-8">
      <SectionHeader
        eyebrow="Sélections du moment"
        title="Nos collections inspirées des usages mobiles."
        description="Populaires, tablettes, accessoires : retrouvez l’esprit de l’app dans une expérience web soignée."
      />
      <div className="space-y-10">
        {productCollections.map(collection => (
          <div key={collection.id} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{collection.title}</h3>
                <p className="text-sm text-slate-600">{collection.description}</p>
              </div>
              <Link href="#catalogue" className="text-sm font-semibold text-slate-900 hover:text-slate-700">
                Voir tout
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {collection.items.map(item => (
                <div key={item.id} className="flex flex-col rounded-2xl bg-slate-50/80 p-4 transition hover:bg-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.highlight}</p>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900">{item.price}</span>
                    <Link href="#product" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                      Voir le produit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightsGrid() {
  return (
    <section id="services" className="space-y-8">
      <SectionHeader
        eyebrow="Pourquoi AfricaPhone ?"
        title="Un accompagnement complet avant et après l’achat."
        description="L’expérience web prolonge les services de l’app et notre présence boutique."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {insightCards.map(card => (
          <article key={card.id} className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-600">{card.description}</p>
            </div>
            <Link href={card.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:gap-3">
              En savoir plus <span aria-hidden>→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</span>
      <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
      <p className="max-w-2xl text-sm text-slate-600">{description}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-600 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-base font-semibold text-slate-900">
            AfricaPhone
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link href="#catalogue" className="hover:text-slate-900">
              Catalogue
            </Link>
            <Link href="#marques" className="hover:text-slate-900">
              Marques
            </Link>
            <Link href="#services" className="hover:text-slate-900">
              Services
            </Link>
            <Link href="#community" className="hover:text-slate-900">
              Communauté
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AfricaPhone. Tous droits réservés.</p>
          <p>
            Suivez-nous sur <span className="font-medium text-slate-700">WhatsApp</span> &{" "}
            <span className="font-medium text-slate-700">Facebook</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
