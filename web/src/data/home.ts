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
};

export const brandHighlights: BrandHighlight[] = [
  {
    id: "oale",
    name: "Oale",
    tagline: "Exclusivités AfricaPhone",
    accentColor: "#f97316",
    background: "from-orange-100 to-orange-50",
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    tagline: "Best-sellers Redmi & Poco",
    accentColor: "#2563eb",
    background: "from-blue-100 to-blue-50",
  },
  {
    id: "villaon",
    name: "Villaon",
    tagline: "Le rapport qualité/prix imbattable",
    accentColor: "#16a34a",
    background: "from-green-100 to-emerald-50",
  },
  {
    id: "accessoires",
    name: "Accessoires",
    tagline: "Chargeurs rapides, audio & plus",
    accentColor: "#9333ea",
    background: "from-purple-100 to-fuchsia-50",
  },
];

export type PromoCard = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  badge?: string;
};

export const promoCards: PromoCard[] = [
  {
    id: "contest",
    title: "Jeu concours AfricaPhone",
    description: "Votez pour votre candidat préféré et tentez de remporter des cadeaux chaque semaine.",
    ctaLabel: "Participer",
    href: "#contest",
    badge: "Nouveau",
  },
  {
    id: "prediction",
    title: "Pronostics foot",
    description: "Défiez la communauté et gagnez des bons d’achat en pronostiquant les matchs à venir.",
    ctaLabel: "Je pronostique",
    href: "#prediction-game",
  },
  {
    id: "boutique",
    title: "Visitez la boutique",
    description: "Retrouvez-nous à Cotonou pour tester les nouveautés avec notre équipe de passionnés.",
    ctaLabel: "Nous trouver",
    href: "#boutique",
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
      { id: "redmi-note-13", name: "Redmi Note 13 Pro", price: "199 900 F", badge: "Best-seller", highlight: "256 Go + 12 Go" },
      { id: "poco-x6", name: "Poco X6", price: "179 900 F", highlight: "AMOLED 120Hz" },
      { id: "oale-10", name: "Oale P10", price: "94 900 F", highlight: "Double SIM" },
      { id: "tecno-spark", name: "Tecno Spark 20", price: "87 900 F", highlight: "Caméra 50MP" },
    ],
  },
  {
    id: "tablets",
    title: "Tablettes & grand écran",
    description: "Pour travailler, apprendre ou se divertir confortablement.",
    items: [
      { id: "xiaomi-pad", name: "Xiaomi Pad 6", price: "254 900 F", highlight: "Snapdragon 870" },
      { id: "lenovo-tab", name: "Lenovo Tab M10", price: "149 900 F", highlight: "Écran 10,1”" },
      { id: "samsung-a9", name: "Galaxy Tab A9", price: "219 900 F", highlight: "Expérience Samsung" },
      { id: "oale-pad", name: "Oale Pad 2", price: "129 900 F", highlight: "Batterie 8000 mAh" },
    ],
  },
  {
    id: "accessories",
    title: "Accessoires indispensables",
    description: "Boostez vos appareils avec notre sélection d’accessoires officiels.",
    items: [
      { id: "powerbank", name: "Powerbank 20 000 mAh", price: "24 900 F", highlight: "Charge rapide 30W" },
      { id: "buds", name: "Écouteurs TWS", price: "18 900 F", highlight: "Réduction de bruit" },
      { id: "charger", name: "Chargeur 65W", price: "15 900 F", highlight: "USB-C universel" },
      { id: "case", name: "Coque protectrice premium", price: "8 900 F", highlight: "Compatibilité 30+ modèles" },
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
  specs?: string;
  highlight?: string;
};

export const allProducts: ProductSummary[] = [
  {
    id: "redmi-note-13-pro-5g-256-12",
    name: "Redmi Note 13 Pro 5G",
    price: "199 900 F",
    category: "Smartphone",
    specs: "256 Go · 12 Go RAM",
    highlight: "Appareil photo 200 MP",
  },
  {
    id: "redmi-note-13-pro-4g-256-8",
    name: "Redmi Note 13 Pro 4G",
    price: "174 900 F",
    category: "Smartphone",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "redmi-note-13-128-8",
    name: "Redmi Note 13",
    price: "149 900 F",
    category: "Smartphone",
    specs: "128 Go · 8 Go RAM",
  },
  {
    id: "poco-x6-pro-512-12",
    name: "Poco X6 Pro",
    price: "229 900 F",
    category: "Smartphone",
    specs: "512 Go · 12 Go RAM",
    highlight: "Écran AMOLED 120 Hz",
  },
  {
    id: "poco-x6-256-8",
    name: "Poco X6",
    price: "179 900 F",
    category: "Smartphone",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "poco-x6-nfc-256-12",
    name: "Poco X6 NFC",
    price: "189 900 F",
    category: "Smartphone",
    specs: "256 Go · 12 Go RAM",
  },
  {
    id: "oale-p10-128-6",
    name: "Oale P10",
    price: "94 900 F",
    category: "Smartphone",
    specs: "128 Go · 6 Go RAM",
    highlight: "Double SIM",
  },
  {
    id: "oale-p8-64-4",
    name: "Oale P8",
    price: "69 900 F",
    category: "Smartphone",
    specs: "64 Go · 4 Go RAM",
  },
  {
    id: "tecno-spark-20-128-8",
    name: "Tecno Spark 20",
    price: "87 900 F",
    category: "Smartphone",
    specs: "128 Go · 8 Go RAM",
    highlight: "Caméra 50 MP",
  },
  {
    id: "tecno-spark-20c-128-4",
    name: "Tecno Spark 20C",
    price: "74 900 F",
    category: "Smartphone",
    specs: "128 Go · 4 Go RAM",
  },
  {
    id: "infinix-hot-40-256-8",
    name: "Infinix Hot 40",
    price: "104 900 F",
    category: "Smartphone",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "infinix-hot-40i-128-8",
    name: "Infinix Hot 40i",
    price: "89 900 F",
    category: "Smartphone",
    specs: "128 Go · 8 Go RAM",
  },
  {
    id: "samsung-a25-5g-128-6",
    name: "Samsung Galaxy A25 5G",
    price: "199 900 F",
    category: "Smartphone",
    specs: "128 Go · 6 Go RAM",
  },
  {
    id: "samsung-a15-128-6",
    name: "Samsung Galaxy A15",
    price: "134 900 F",
    category: "Smartphone",
    specs: "128 Go · 6 Go RAM",
  },
  {
    id: "samsung-tab-a9-64-4",
    name: "Galaxy Tab A9",
    price: "219 900 F",
    category: "Tablette",
    specs: "64 Go · 4 Go RAM",
    highlight: "Écran 11\"",
  },
  {
    id: "xiaomi-pad-6-256-8",
    name: "Xiaomi Pad 6",
    price: "254 900 F",
    category: "Tablette",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "lenovo-tab-m10-128-4",
    name: "Lenovo Tab M10",
    price: "149 900 F",
    category: "Tablette",
    specs: "128 Go · 4 Go RAM",
  },
  {
    id: "oale-pad-2-128-6",
    name: "Oale Pad 2",
    price: "129 900 F",
    category: "Tablette",
    specs: "128 Go · 6 Go RAM",
    highlight: "Batterie 8000 mAh",
  },
  {
    id: "apple-watch-series-9-gps-41",
    name: "Apple Watch Series 9 GPS 41 mm",
    price: "259 900 F",
    category: "Wearable",
    specs: "Puce S9 · Résistance 50 m",
  },
  {
    id: "xiaomi-watch-2-lite",
    name: "Xiaomi Watch 2 Lite",
    price: "59 900 F",
    category: "Wearable",
    specs: "GPS intégré · 100 sports",
  },
  {
    id: "apple-airpods-3",
    name: "Apple AirPods 3",
    price: "159 900 F",
    category: "Accessoire",
    specs: "Audio spatial · MagSafe",
  },
  {
    id: "buds-tws-pro",
    name: "Écouteurs TWS Pro",
    price: "18 900 F",
    category: "Accessoire",
    specs: "Réduction de bruit",
  },
  {
    id: "powerbank-20000-30w",
    name: "Powerbank 20 000 mAh",
    price: "24 900 F",
    category: "Accessoire",
    specs: "Charge rapide 30 W",
  },
  {
    id: "chargeur-65w-usbc",
    name: "Chargeur GaN 65 W",
    price: "15 900 F",
    category: "Accessoire",
    specs: "Triple port USB-C / USB-A",
  },
  {
    id: "coque-premium-universelle",
    name: "Coque protectrice premium",
    price: "8 900 F",
    category: "Accessoire",
    specs: "Compatibilité 30+ modèles",
  },
  {
    id: "routeur-4g-lte",
    name: "Routeur Wi-Fi 4G LTE",
    price: "39 900 F",
    category: "Accessoire",
    specs: "Dual band · 64 appareils",
  },
];
