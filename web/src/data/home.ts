export type HeroLink = {
  label: string;
  href: string;
};

export const heroContent = {
  tag: "Nouveautés",
  title: "AfricaPhone, l’expérience mobile d’exception à portée de clic.",
  description:
    "Explorez les smartphones, tablettes et accessoires iconiques sélectionnés par nos experts. Profitez de conseils personnalisés, de garanties locales et des mêmes privilèges que dans nos boutiques premium.",
  primaryCta: {
    label: "Explorer le catalogue",
    href: "#catalogue",
  } satisfies HeroLink,
  secondaryCta: {
    label: "Découvrir nos services",
    href: "#services",
  } satisfies HeroLink,
  tertiaryCta: {
    label: "Parler à un conseiller",
    href: "#contact",
  } satisfies HeroLink,
} as const;

export type BrandHighlight = {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  background: string;
  description: string;
  logoUrl: string;
  cta: HeroLink;
};

export const brandHighlights: BrandHighlight[] = [
  {
    id: "tecno",
    name: "Tecno",
    tagline: "Innovation accessible",
    accentColor: "#2563eb",
    background: "from-blue-100 to-blue-50",
    description: "Design audacieux, performances équilibrées et services AfricaPhone premium.",
    logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=200&q=80",
    cta: { label: "Focus Tecno", href: "/catalog/tecno" },
  },
  {
    id: "infinix",
    name: "Infinix",
    tagline: "Power & Style",
    accentColor: "#22c55e",
    background: "from-green-100 to-emerald-50",
    description: "Autonomie XXL, écrans 120 Hz et accessoires gaming pour créateurs nomades.",
    logoUrl: "https://images.unsplash.com/photo-1610792516820-0d5f8e5385a6?auto=format&fit=crop&w=200&q=80",
    cta: { label: "Voir la gamme Infinix", href: "/catalog/infinix" },
  },
  {
    id: "redmi",
    name: "Redmi",
    tagline: "Performance MI",
    accentColor: "#f97316",
    background: "from-orange-100 to-orange-50",
    description: "Le meilleur de Xiaomi : capteurs 200 MP, charge turbo et MIUI optimisé.",
    logoUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=200&q=80",
    cta: { label: "Choisir un Redmi", href: "/catalog/redmi" },
  },
  {
    id: "itel",
    name: "Itel",
    tagline: "Toujours connecté",
    accentColor: "#ef4444",
    background: "from-rose-100 to-rose-50",
    description: "Fiabilité, double SIM 4G et budgets maîtrisés pour rester joignable partout.",
    logoUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80",
    cta: { label: "Découvrir Itel", href: "/catalog/itel" },
  },
  {
    id: "samsung",
    name: "Samsung",
    tagline: "Galaxy Experience",
    accentColor: "#0f172a",
    background: "from-slate-200 to-slate-100",
    description: "Écosystème Galaxy, écrans AMOLED et productivité haut de gamme sur-mesure.",
    logoUrl: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=200&q=80",
    cta: { label: "Solutions Galaxy", href: "/catalog/samsung" },
  },
];

export const productSegments = [
  "Populaires",
  "Tablettes",
  "Téléphones à touches",
  "Accessoires",
  "Audio",
  "Offres exclusives",
] as const;

export type PromoCard = {
  id: string;
  title: string;
  description: string;
  cta: HeroLink;
  badge?: string;
  image: string;
};

export const promoCards: PromoCard[] = [
  {
    id: "launch-protect",
    title: "Protection premium offerte",
    description: "Film trempé HD + pose express pour toute précommande de flagship Galaxy.",
    badge: "Offre limitée",
    cta: { label: "Réserver maintenant", href: "#contact" },
    image: "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "switch-days",
    title: "Switch Days AfricaPhone",
    description: "Reprise immédiate de votre ancien smartphone + bonus fidélité 20 000 FCFA.",
    badge: "Trade-in",
    cta: { label: "Estimer mon appareil", href: "#finance" },
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "campus-pack",
    title: "Pack Campus connecté",
    description: "Tablette + MiFi + coaching productivité pour booster votre rentrée.",
    cta: { label: "Découvrir l’offre", href: "#collections" },
    image: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80",
  },
];

export type ProductHighlight = {
  id: string;
  name: string;
  price: string;
  badge?: string;
  highlight: string;
};

export type ProductCollection = {
  id: string;
  title: string;
  description: string;
  items: ProductHighlight[];
  cta: HeroLink;
};

export const productCollections: ProductCollection[] = [
  {
    id: "popular",
    title: "Populaires en ce moment",
    description: "Sélection best-sellers validée par nos conseillers boutique.",
    cta: { label: "Voir tous les best-sellers", href: "/catalog?filter=best-sellers" },
    items: [
      { id: "redmi-note-13", name: "Redmi Note 13 Pro", price: "199 900 FCFA", badge: "Best-seller", highlight: "256 Go · 12 Go RAM" },
      { id: "poco-x6", name: "Poco X6", price: "179 900 FCFA", highlight: "AMOLED 120 Hz · 67 W" },
      { id: "itel-p55", name: "Itel P55 5G", price: "124 900 FCFA", highlight: "5G · Batterie 5000 mAh" },
      { id: "tecno-spark-20", name: "Tecno Spark 20", price: "87 900 FCFA", highlight: "Caméra 50 MP · HiOS 13" },
    ],
  },
  {
    id: "creator",
    title: "Studios créateurs",
    description: "Outils mobiles clés en main pour produire, monter et diffuser sans limites.",
    cta: { label: "Composer mon setup créateur", href: "/services/creators" },
    items: [
      { id: "samsung-s23", name: "Galaxy S23 Ultra", price: "559 900 FCFA", highlight: "Capteur 200 MP · S-Pen" },
      { id: "ipad-air", name: "iPad Air M1", price: "489 900 FCFA", highlight: "iPadOS + Pencil" },
      { id: "rode-wireless", name: "Rode Wireless ME", price: "149 900 FCFA", highlight: "Audio pro instantané" },
      { id: "dji-osmo", name: "DJI Osmo Mobile SE", price: "119 900 FCFA", highlight: "Stabilisation 3 axes" },
    ],
  },
];

export type InsightCard = {
  id: string;
  title: string;
  description: string;
  proof: string;
  benefit: string;
  href: string;
  cta: HeroLink;
};

export const insightCards: InsightCard[] = [
  {
    id: "store",
    title: "Conseillers AfricaPhone",
    description: "Accompagnement sur-mesure avant, pendant et après votre achat, en boutique ou à distance.",
    proof: "98 % de satisfaction client sur nos diagnostics express.",
    benefit: "Vos réglages sont prêts le jour de la livraison.",
    href: "#services",
    cta: { label: "Prendre rendez-vous", href: "#contact" },
  },
  {
    id: "support",
    title: "Support premium",
    description: "Diagnostic WhatsApp, extension de garantie et prêt d’appareil pendant l’intervention.",
    proof: "Intervention moyenne en moins de 48 h ouvrées.",
    benefit: "Prolongez la durée de vie de votre équipement.",
    href: "#services",
    cta: { label: "Activer AfricaPhone Care+", href: "#contact" },
  },
  {
    id: "community",
    title: "Communauté ambassadeur",
    description: "Accès en avant-première, événements exclusifs et programme de parrainage généreux.",
    proof: "Plus de 200 ambassadeurs actifs sur le territoire.",
    benefit: "Cumulez des avantages sur chaque recommandation.",
    href: "#community",
    cta: { label: "Rejoindre le mouvement", href: "#community" },
  },
];

export type BrandNarrativeStep = {
  id: string;
  title: string;
  description: string;
  proof: string;
};

export const brandNarrative = {
  title: "Notre engagement depuis 2014",
  subtitle: "Nous accompagnons chaque client AfricaPhone du conseil initial au suivi longue durée.",
  steps: [
    {
      id: "discover",
      title: "Découverte & conseil",
      description: "Analyse de vos usages, projections budgétaires et recommandations d’experts certifiés.",
      proof: "Plus de 15 000 projets personnalisés menés au Bénin.",
    },
    {
      id: "delivery",
      title: "Préparation & livraison premium",
      description: "Configuration complète, transfert de données sécurisé et livraison express dans tout le pays.",
      proof: "Livraison 24 h sur Cotonou et 72 h max sur le territoire national.",
    },
    {
      id: "care",
      title: "Suivi continu",
      description: "Diagnostic WhatsApp, extension de garantie, ateliers en ligne et offres de renouvellement.",
      proof: "9 clients sur 10 renouvellent avec AfricaPhone dans les 18 mois.",
    },
  ] satisfies BrandNarrativeStep[],
  cta: { label: "Discuter avec un expert", href: "#contact" },
} as const;

export type ProductSummary = {
  id: string;
  name: string;
  price: string;
  category: string;
  brandId: string;
  segment: (typeof productSegments)[number];
  description: string;
  image: string;
  storage: string;
  highlight?: string;
};

export const allProducts: ProductSummary[] = [
  {
    id: "redmi-note-13-pro-256-12",
    name: "Redmi Note 13 Pro 5G",
    price: "209 900 FCFA",
    category: "Smartphone",
    brandId: "redmi",
    segment: "Populaires",
    description: "Capteur 200 MP, écran AMOLED 120 Hz et charge turbo 67 W pour un usage intensif.",
    image: "https://images.unsplash.com/photo-1510552776732-01acc9a4cbd0?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go · 12 Go RAM",
    highlight: "Capteur 200 MP",
  },
  {
    id: "galaxy-a25-5g-128-6",
    name: "Galaxy A25 5G",
    price: "199 900 FCFA",
    category: "Smartphone",
    brandId: "samsung",
    segment: "Populaires",
    description: "Connectivité 5G, écran Super AMOLED et garantie officielle 12 mois AfricaPhone.",
    image: "https://images.unsplash.com/photo-1600172454520-13432b0fde0a?auto=format&fit=crop&w=900&q=80",
    storage: "128 Go · 6 Go RAM",
    highlight: "Livraison premium",
  },
  {
    id: "tecno-spark-20-pro-plus",
    name: "Tecno Spark 20 Pro+",
    price: "115 900 FCFA",
    category: "Smartphone",
    brandId: "tecno",
    segment: "Populaires",
    description: "Design incurvé, capteur 108 MP et HiOS 13 pour un quotidien fluide et élégant.",
    image: "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go · 8 Go RAM",
    highlight: "Charge 45 W",
  },
  {
    id: "infinix-note-30-256-8",
    name: "Infinix Note 30",
    price: "139 900 FCFA",
    category: "Smartphone",
    brandId: "infinix",
    segment: "Populaires",
    description: "Écran 120 Hz, audio JBL et batterie 5000 mAh pour les créateurs nomades.",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d7627?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go · 8 Go RAM",
    highlight: "Audio signé JBL",
  },
  {
    id: "itel-p55-5g",
    name: "Itel P55 5G",
    price: "124 900 FCFA",
    category: "Smartphone",
    brandId: "itel",
    segment: "Populaires",
    description: "Double SIM 5G, 128 Go de stockage et garantie AfricaPhone incluse.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    storage: "128 Go · 6 Go RAM",
    highlight: "Autonomie 5000 mAh",
  },
  {
    id: "ipad-10-64",
    name: "iPad 10e génération",
    price: "349 900 FCFA",
    category: "Tablette",
    brandId: "samsung",
    segment: "Tablettes",
    description: "Écran 10,9\" Liquid Retina, Apple Pencil et productivité iPadOS.",
    image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=900&q=80",
    storage: "64 Go",
    highlight: "Compatible Pencil",
  },
  {
    id: "galaxy-tab-s9",
    name: "Galaxy Tab S9",
    price: "599 900 FCFA",
    category: "Tablette",
    brandId: "samsung",
    segment: "Tablettes",
    description: "Écran AMOLED 120 Hz, processeur Snapdragon 8 Gen 2 et S Pen inclus.",
    image: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go",
    highlight: "Indice IP68",
  },
  {
    id: "redmi-pad-se",
    name: "Redmi Pad SE",
    price: "199 900 FCFA",
    category: "Tablette",
    brandId: "redmi",
    segment: "Tablettes",
    description: "Écran 11\" 90 Hz et quad speakers pour streaming et divertissement.",
    image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
    storage: "128 Go · 6 Go RAM",
    highlight: "Dolby Atmos",
  },
  {
    id: "nokia-105-4g",
    name: "Nokia 105 4G",
    price: "24 900 FCFA",
    category: "Téléphone à touches",
    brandId: "itel",
    segment: "Téléphones à touches",
    description: "Fiabilité Nokia, torch LED et radio FM sans fil pour rester joignable.",
    image: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80",
    storage: "Sim simple",
    highlight: "Autonomie 5 jours",
  },
  {
    id: "itel-icon-2",
    name: "Itel Icon 2",
    price: "19 900 FCFA",
    category: "Téléphone à touches",
    brandId: "itel",
    segment: "Téléphones à touches",
    description: "Double SIM, clavier XXL et batterie longue durée pour les usages essentiels.",
    image: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80",
    storage: "32 Mo + carte SD",
    highlight: "Lampe torche intégrée",
  },
  {
    id: "anker-soundcore",
    name: "Anker Soundcore Liberty 4",
    price: "89 900 FCFA",
    category: "Audio",
    brandId: "tecno",
    segment: "Audio",
    description: "ANC adaptative, double drivers et spatial audio pour une immersion totale.",
    image: "https://images.unsplash.com/photo-1510924199351-4a516361b3b9?auto=format&fit=crop&w=900&q=80",
    storage: "Jusqu’à 28 h avec boîtier",
    highlight: "Hi-Res Wireless",
  },
  {
    id: "sony-whch720",
    name: "Sony WH-CH720N",
    price: "129 900 FCFA",
    category: "Audio",
    brandId: "samsung",
    segment: "Audio",
    description: "Casque Bluetooth ANC léger avec optimisation vocale et autonomie 35 h.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    storage: "Bluetooth 5.2",
    highlight: "Mode multipoint",
  },
  {
    id: "anker-gan-65w",
    name: "Chargeur GaN 65 W",
    price: "15 900 FCFA",
    category: "Accessoire",
    brandId: "tecno",
    segment: "Accessoires",
    description: "Chargeur compact 3 ports USB-C/A pour smartphone, tablette et ordinateur.",
    image: "https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=900&q=80",
    storage: "3 ports rapides",
    highlight: "Technologie GaN",
  },
  {
    id: "satechi-dock",
    name: "Station de charge 6 ports",
    price: "29 900 FCFA",
    category: "Accessoire",
    brandId: "samsung",
    segment: "Accessoires",
    description: "Organiseur bois + USB rapide pour recharger six appareils simultanément.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    storage: "6 ports USB",
    highlight: "Livrée avec câbles",
  },
  {
    id: "verre-trempe-pack",
    name: "Pack verres trempés premium",
    price: "9 900 FCFA",
    category: "Accessoire",
    brandId: "tecno",
    segment: "Accessoires",
    description: "Lot de 3 protections 9H avec kit de pose et garantie fissure 6 mois.",
    image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80",
    storage: "Pack de 3",
    highlight: "Revêtement oléophobe",
  },
  {
    id: "bundle-back-to-school",
    name: "Pack rentrée premium",
    price: "189 900 FCFA",
    category: "Offre exclusive",
    brandId: "redmi",
    segment: "Offres exclusives",
    description: "Smartphone Redmi A3 + coque renforcée + écouteurs + coaching productivité.",
    image: "https://images.unsplash.com/photo-1583324113626-70df0f4deaab?auto=format&fit=crop&w=900&q=80",
    storage: "64 Go · 4 Go RAM",
    highlight: "Économisez 25 000 FCFA",
  },
  {
    id: "pack-gamer-mobile",
    name: "Pack gamer mobile",
    price: "249 900 FCFA",
    category: "Offre exclusive",
    brandId: "infinix",
    segment: "Offres exclusives",
    description: "Infinix Zero 30, manette Bluetooth, refroidisseur RGB et coaching streaming.",
    image: "https://images.unsplash.com/photo-1585076800937-0b88ff6e08db?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go · 12 Go RAM",
    highlight: "Accessoires inclus",
  },
  {
    id: "bundle-entreprise",
    name: "Pack business connect",
    price: "329 900 FCFA",
    category: "Offre exclusive",
    brandId: "samsung",
    segment: "Offres exclusives",
    description: "Galaxy A54 + tablette Tab A9 + suite Microsoft 365 + service onboarding pro.",
    image: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80",
    storage: "256 Go + 128 Go",
    highlight: "Support dédié PME",
  },
];
