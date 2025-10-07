export const heroContent = {
  tag: "Nouveautés",
  title: "Retrouvez AfricaPhone partout, même sur le web.",
  description:
    "Explorez les smartphones, tablettes et accessoires du moment, bénéficiez des mêmes promos que sur l’app et restez informé des concours exclusifs.",
  primaryCta: {
    label: "Explorer le catalogue",
    href: "#catalogue",
  },
  secondaryCta: {
    label: "Découvrir la boutique",
    href: "#boutique",
  },
};

export type BrandHighlight = {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  background: string;
  description: string;
  logoUrl: string;
};

export const brandHighlights: BrandHighlight[] = [
  {
    id: "tecno",
    name: "Tecno",
    tagline: "Innovation accessible",
    accentColor: "#2563eb",
    background: "from-blue-100 to-blue-50",
    description: "Smartphones pensés pour la jeunesse africaine.",
    logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "infinix",
    name: "Infinix",
    tagline: "Power & Style",
    accentColor: "#22c55e",
    background: "from-green-100 to-emerald-50",
    description: "Performance et autonomie pour les gamers nomades.",
    logoUrl: "https://images.unsplash.com/photo-1610792516820-0d5f8e5385a6?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "redmi",
    name: "Redmi",
    tagline: "Performance MI",
    accentColor: "#f97316",
    background: "from-orange-100 to-orange-50",
    description: "Le meilleur de Xiaomi à prix doux.",
    logoUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "itel",
    name: "Itel",
    tagline: "Toujours connecté",
    accentColor: "#ef4444",
    background: "from-rose-100 to-rose-50",
    description: "Des téléphones fiables pour tous les budgets.",
    logoUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "samsung",
    name: "Samsung",
    tagline: "Galaxy Experience",
    accentColor: "#0f172a",
    background: "from-slate-200 to-slate-100",
    description: "L’écosystème Galaxy pour vos projets pro et perso.",
    logoUrl: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=200&q=80",
  },
];

export const productSegments = ["Populaires", "Tablettes", "A touches", "Accessoires", "Audio", "Offres"] as const;

export type PromoCard = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  badge?: string;
  image: string;
};

export const promoCards: PromoCard[] = [
  {
    id: "prediction",
    title: "Pronostics Football",
    description: "Tentez de deviner le score et gagnez des cadeaux exclusifs.",
    ctaLabel: "Jouer maintenant",
    href: "#prediction-game",
    badge: "Gagnez",
    image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "store",
    title: "Notre boutique",
    description: "Située près de l’Église des Vainqueurs, Cotonou. Passez nous voir !",
    ctaLabel: "Découvrir",
    href: "#boutique",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
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
};

export const productCollections: ProductCollection[] = [
  {
    id: "popular",
    title: "Populaires en ce moment",
    description: "Les smartphones les plus demandés par la communauté mobile.",
    items: [
      { id: "redmi-note-13", name: "Redmi Note 13 Pro", price: "199 900 FCFA", badge: "Best-seller", highlight: "256 Go + 12 Go" },
      { id: "poco-x6", name: "Poco X6", price: "179 900 FCFA", highlight: "AMOLED 120Hz" },
      { id: "oale-10", name: "Oale P10", price: "94 900 FCFA", highlight: "Double SIM" },
      { id: "tecno-spark", name: "Tecno Spark 20", price: "87 900 FCFA", highlight: "Caméra 50MP" },
    ],
  },
];

export const insightCards = [
  {
    id: "store",
    title: "Une équipe proche de vous",
    description:
      "Conseils personnalisés, configuration express et livraison rapide dans tout le Bénin.",
    href: "#services",
  },
  {
    id: "support",
    title: "Support après-vente dédié",
    description: "Diagnostic et assistance WhatsApp pour chaque appareil acheté chez AfricaPhone.",
    href: "#support",
  },
  {
    id: "community",
    title: "Communauté engagée",
    description: "Participez aux précommandes, événements live et programmes ambassadeurs.",
    href: "#community",
  },
];

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
    id: "redmi-a5-64-6",
    name: "Redmi A5",
    price: "44 000 FCFA",
    category: "Smartphone",
    brandId: "redmi",
    segment: "Populaires",
    description: "Le best-seller accessible avec écran large et batterie 5000 mAh.",
    image: "https://images.unsplash.com/photo-1549921296-3b4a4f919c9b?auto=format&fit=crop&w=900&q=80",
    storage: "64GB + 6RAM",
    highlight: "Mode nuit optimisé",
  },
  {
    id: "tecno-pop-10c-64-4",
    name: "Tecno Pop 10C",
    price: "45 000 FCFA",
    category: "Smartphone",
    brandId: "tecno",
    segment: "Populaires",
    description: "Capturez votre quotidien avec un double capteur et une autonomie solide.",
    image: "https://images.unsplash.com/photo-1617032212873-6849900f09da?auto=format&fit=crop&w=900&q=80",
    storage: "64GB + 4RAM",
    highlight: "Double SIM 4G",
  },
  {
    id: "infinix-note-30-256-8",
    name: "Infinix Note 30",
    price: "139 900 FCFA",
    category: "Smartphone",
    brandId: "infinix",
    segment: "Populaires",
    description: "Écran 120 Hz et charge rapide 45 W pour les utilisateurs exigeants.",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d7627?auto=format&fit=crop&w=900&q=80",
    storage: "256GB + 8RAM",
    highlight: "Haut-parleurs JBL",
  },
  {
    id: "galaxy-a25-5g-128-6",
    name: "Galaxy A25 5G",
    price: "199 900 FCFA",
    category: "Smartphone",
    brandId: "samsung",
    segment: "Populaires",
    description: "Profitez de la 5G Samsung avec écran Super AMOLED et One UI 6.",
    image: "https://images.unsplash.com/photo-1600172454520-13432b0fde0a?auto=format&fit=crop&w=900&q=80",
    storage: "128GB + 6RAM",
    highlight: "Garantie 12 mois",
  },
  {
    id: "xiaomi-pad-6-256-8",
    name: "Xiaomi Pad 6",
    price: "254 900 FCFA",
    category: "Tablette",
    brandId: "redmi",
    segment: "Tablettes",
    description: "Un écran 11\" 120 Hz pour travailler, dessiner ou regarder vos séries.",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    storage: "256GB + 8RAM",
    highlight: "Stylet et clavier compatibles",
  },
  {
    id: "galaxy-tab-a9-64-4",
    name: "Galaxy Tab A9",
    price: "219 900 FCFA",
    category: "Tablette",
    brandId: "samsung",
    segment: "Tablettes",
    description: "La tablette familiale Samsung avec Dolby Atmos et Kids Mode.",
    image: "https://images.unsplash.com/photo-1510554310709-1982d92bd835?auto=format&fit=crop&w=900&q=80",
    storage: "64GB + 4RAM",
    highlight: "Écran 11\" lumineux",
  },
  {
    id: "nokia-105-4g",
    name: "Nokia 105 4G",
    price: "24 900 FCFA",
    category: "Téléphone à touches",
    brandId: "itel",
    segment: "A touches",
    description: "La robustesse Nokia avec radio FM sans fil et lampe torche pratique.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    storage: "Double SIM",
    highlight: "Autonomie 18 jours",
  },
  {
    id: "itel-icon",
    name: "Itel Icon",
    price: "19 900 FCFA",
    category: "Téléphone à touches",
    brandId: "itel",
    segment: "A touches",
    description: "Un téléphone de secours avec batterie XXL et haut-parleur puissant.",
    image: "https://images.unsplash.com/photo-1573167243879-df1e86cbb0f9?auto=format&fit=crop&w=900&q=80",
    storage: "Double SIM",
    highlight: "Lampe torche intégrée",
  },
  {
    id: "powerbank-20000-30w",
    name: "Powerbank 20 000 mAh",
    price: "24 900 FCFA",
    category: "Accessoire",
    brandId: "tecno",
    segment: "Accessoires",
    description: "Rechargez trois appareils à la fois avec la charge rapide 30W.",
    image: "https://images.unsplash.com/photo-1580894894513-541e068a5b41?auto=format&fit=crop&w=900&q=80",
    storage: "USB-C + USB-A",
    highlight: "Affichage LED du niveau",
  },
  {
    id: "chargeur-gan-65w",
    name: "Chargeur GaN 65 W",
    price: "15 900 FCFA",
    category: "Accessoire",
    brandId: "tecno",
    segment: "Accessoires",
    description: "Le chargeur universel compact pour smartphones, tablettes et PC.",
    image: "https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=900&q=80",
    storage: "3 ports rapides",
    highlight: "Technologie GaN",
  },
  {
    id: "airpods-3",
    name: "Apple AirPods 3",
    price: "159 900 FCFA",
    category: "Audio",
    brandId: "samsung",
    segment: "Audio",
    description: "L’audio spatial immersif Apple avec boîtier MagSafe.",
    image: "https://images.unsplash.com/photo-1510924199351-4a516361b3b9?auto=format&fit=crop&w=900&q=80",
    storage: "Jusqu’à 6h d’écoute",
    highlight: "Résistance à l’eau IPX4",
  },
  {
    id: "tws-pro",
    name: "Écouteurs TWS Pro",
    price: "18 900 FCFA",
    category: "Audio",
    brandId: "tecno",
    segment: "Audio",
    description: "Réduction de bruit active et connexion instantanée Bluetooth 5.3.",
    image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=900&q=80",
    storage: "Jusqu’à 28h avec boîtier",
    highlight: "Mode transparence",
  },
  {
    id: "bundle-offre",
    name: "Pack rentrée smartphone + accessoires",
    price: "89 900 FCFA",
    category: "Offre spéciale",
    brandId: "redmi",
    segment: "Offres",
    description: "Un smartphone Redmi A5 avec coque, film de protection et écouteurs.",
    image: "https://images.unsplash.com/photo-1583324113626-70df0f4deaab?auto=format&fit=crop&w=900&q=80",
    storage: "64GB + 4RAM",
    highlight: "Économisez 15 000 FCFA",
  },
];
