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
    id: "oale",
    name: "Oale",
    tagline: "Exclusivités AfricaPhone",
    accentColor: "#f97316",
    background: "from-orange-100 to-orange-50",
    description: "Smartphones optimisés pour l’Afrique, robustes et abordables.",
    logoUrl: "https://source.unsplash.com/seed/oale-logo/200x200?logo,orange",
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    tagline: "Best-sellers Redmi & Poco",
    accentColor: "#2563eb",
    background: "from-blue-100 to-blue-50",
    description: "La performance accessible avec Redmi, Poco et les séries Pad.",
    logoUrl: "https://source.unsplash.com/seed/xiaomi-logo/200x200?logo,blue",
  },
  {
    id: "villaon",
    name: "Villaon",
    tagline: "Le rapport qualité/prix imbattable",
    accentColor: "#16a34a",
    background: "from-green-100 to-emerald-50",
    description: "La gamme au meilleur prix pour rester connecté partout.",
    logoUrl: "https://source.unsplash.com/seed/villaon-logo/200x200?logo,green",
  },
  {
    id: "accessoires",
    name: "Accessoires",
    tagline: "Chargeurs rapides, audio & plus",
    accentColor: "#9333ea",
    background: "from-purple-100 to-fuchsia-50",
    description: "Tout pour compléter votre équipement mobile au quotidien.",
    logoUrl: "https://source.unsplash.com/seed/accessoires-logo/200x200?logo,purple",
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
  brandId: string;
  description: string;
  image: string;
  specs?: string;
  highlight?: string;
};

export const allProducts: ProductSummary[] = [
  {
    id: "redmi-note-13-pro-5g-256-12",
    name: "Redmi Note 13 Pro 5G",
    price: "199 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "Le smartphone polyvalent avec capteur 200 MP et charge rapide.",
    image: "https://images.unsplash.com/photo-1610792516820-0d5f8e5385a6?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 12 Go RAM",
    highlight: "Appareil photo 200 MP",
  },
  {
    id: "redmi-note-13-pro-4g-256-8",
    name: "Redmi Note 13 Pro 4G",
    price: "174 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "La version 4G avec écran AMOLED 120 Hz et autonomie solide.",
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "redmi-note-13-128-8",
    name: "Redmi Note 13",
    price: "149 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "Un design premium et une expérience fluide à prix contenu.",
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 8 Go RAM",
  },
  {
    id: "poco-x6-pro-512-12",
    name: "Poco X6 Pro",
    price: "229 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "Pensé pour le gaming mobile avec un écran 120 Hz ultra lumineux.",
    image: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=800&q=80",
    specs: "512 Go · 12 Go RAM",
    highlight: "Écran AMOLED 120 Hz",
  },
  {
    id: "poco-x6-256-8",
    name: "Poco X6",
    price: "179 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "Performance et autonomie pour les power users au quotidien.",
    image: "https://images.unsplash.com/photo-1549921296-3b4a4f919c9b?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "poco-x6-nfc-256-12",
    name: "Poco X6 NFC",
    price: "189 900 F",
    category: "Smartphone",
    brandId: "xiaomi",
    description: "Ajoutez le NFC pour vos paiements mobiles sécurisés.",
    image: "https://images.unsplash.com/photo-1510552776732-01acc9a4cbd0?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 12 Go RAM",
  },
  {
    id: "oale-p10-128-6",
    name: "Oale P10",
    price: "94 900 F",
    category: "Smartphone",
    brandId: "oale",
    description: "Essentiel et robuste, parfait pour une utilisation professionnelle.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 6 Go RAM",
    highlight: "Double SIM",
  },
  {
    id: "oale-p8-64-4",
    name: "Oale P8",
    price: "69 900 F",
    category: "Smartphone",
    brandId: "oale",
    description: "Un smartphone accessible avec batterie endurante.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
    specs: "64 Go · 4 Go RAM",
  },
  {
    id: "tecno-spark-20-128-8",
    name: "Tecno Spark 20",
    price: "87 900 F",
    category: "Smartphone",
    brandId: "villaon",
    description: "Immortalisez chaque instant avec sa caméra 50 MP et l’IA Tecno.",
    image: "https://images.unsplash.com/photo-1617032212873-6849900f09da?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 8 Go RAM",
    highlight: "Caméra 50 MP",
  },
  {
    id: "tecno-spark-20c-128-4",
    name: "Tecno Spark 20C",
    price: "74 900 F",
    category: "Smartphone",
    brandId: "villaon",
    description: "Conçu pour les réseaux sociaux avec une autonomie rassurante.",
    image: "https://images.unsplash.com/photo-1573167243879-df1e86cbb0f9?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 4 Go RAM",
  },
  {
    id: "infinix-hot-40-256-8",
    name: "Infinix Hot 40",
    price: "104 900 F",
    category: "Smartphone",
    brandId: "villaon",
    description: "Un grand écran lumineux et des performances équilibrées.",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d7627?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "infinix-hot-40i-128-8",
    name: "Infinix Hot 40i",
    price: "89 900 F",
    category: "Smartphone",
    brandId: "villaon",
    description: "Conçu pour le streaming et la photo à prix malin.",
    image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 8 Go RAM",
  },
  {
    id: "samsung-a25-5g-128-6",
    name: "Samsung Galaxy A25 5G",
    price: "199 900 F",
    category: "Smartphone",
    brandId: "accessoires",
    description: "Profitez de One UI et d’un suivi logiciel longue durée.",
    image: "https://images.unsplash.com/photo-1600172454520-13432b0fde0a?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 6 Go RAM",
  },
  {
    id: "samsung-a15-128-6",
    name: "Samsung Galaxy A15",
    price: "134 900 F",
    category: "Smartphone",
    brandId: "accessoires",
    description: "Le meilleur de Samsung sur un format compact et élégant.",
    image: "https://images.unsplash.com/photo-1506812574058-fc75fa93fead?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 6 Go RAM",
  },
  {
    id: "samsung-tab-a9-64-4",
    name: "Galaxy Tab A9",
    price: "219 900 F",
    category: "Tablette",
    brandId: "accessoires",
    description: "Votre compagnon multimédia avec un écran 11 pouces immersif.",
    image: "https://images.unsplash.com/photo-1510554310709-1982d92bd835?auto=format&fit=crop&w=800&q=80",
    specs: "64 Go · 4 Go RAM",
    highlight: 'Écran 11"',
  },
  {
    id: "xiaomi-pad-6-256-8",
    name: "Xiaomi Pad 6",
    price: "254 900 F",
    category: "Tablette",
    brandId: "xiaomi",
    description: "Une tablette premium pour travailler, dessiner et se divertir.",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
    specs: "256 Go · 8 Go RAM",
  },
  {
    id: "lenovo-tab-m10-128-4",
    name: "Lenovo Tab M10",
    price: "149 900 F",
    category: "Tablette",
    brandId: "accessoires",
    description: "Pensée pour la famille avec Kids Mode et son stéréo.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 4 Go RAM",
  },
  {
    id: "oale-pad-2-128-6",
    name: "Oale Pad 2",
    price: "129 900 F",
    category: "Tablette",
    brandId: "oale",
    description: "Écran large, connectivité 4G et batterie longue durée.",
    image: "https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=800&q=80",
    specs: "128 Go · 6 Go RAM",
    highlight: "Batterie 8000 mAh",
  },
  {
    id: "apple-watch-series-9-gps-41",
    name: "Apple Watch Series 9 GPS 41 mm",
    price: "259 900 F",
    category: "Wearable",
    brandId: "accessoires",
    description: "Suivez votre activité et recevez vos notifications en un clin d’œil.",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80",
    specs: "Puce S9 · Résistance 50 m",
  },
  {
    id: "xiaomi-watch-2-lite",
    name: "Xiaomi Watch 2 Lite",
    price: "59 900 F",
    category: "Wearable",
    brandId: "xiaomi",
    description: "Un suivi sport complet avec GPS intégré et 100 modes.",
    image: "https://images.unsplash.com/photo-1472417583565-62e7bdeda490?auto=format&fit=crop&w=800&q=80",
    specs: "GPS intégré · 100 sports",
  },
  {
    id: "apple-airpods-3",
    name: "Apple AirPods 3",
    price: "159 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "L’audio spatial immersif avec recharge MagSafe simplifiée.",
    image: "https://images.unsplash.com/photo-1510924199351-4a516361b3b9?auto=format&fit=crop&w=800&q=80",
    specs: "Audio spatial · MagSafe",
  },
  {
    id: "buds-tws-pro",
    name: "Écouteurs TWS Pro",
    price: "18 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "Une expérience sans fil confortable avec réduction de bruit.",
    image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=800&q=80",
    specs: "Réduction de bruit",
  },
  {
    id: "powerbank-20000-30w",
    name: "Powerbank 20 000 mAh",
    price: "24 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "Rechargez vos appareils plusieurs fois, partout.",
    image: "https://images.unsplash.com/photo-1580894894513-541e068a5b41?auto=format&fit=crop&w=800&q=80",
    specs: "Charge rapide 30 W",
  },
  {
    id: "chargeur-65w-usbc",
    name: "Chargeur GaN 65 W",
    price: "15 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "Un chargeur universel compact pour smartphones et laptops.",
    image: "https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=800&q=80",
    specs: "Triple port USB-C / USB-A",
  },
  {
    id: "coque-premium-universelle",
    name: "Coque protectrice premium",
    price: "8 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "Une finition mate anti-chocs compatible avec 30 modèles.",
    image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80",
    specs: "Compatibilité 30+ modèles",
  },
  {
    id: "routeur-4g-lte",
    name: "Routeur Wi-Fi 4G LTE",
    price: "39 900 F",
    category: "Accessoire",
    brandId: "accessoires",
    description: "Distribuez un réseau 4G fiable à toute la maison.",
    image: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80",
    specs: "Dual band · 64 appareils",
  },
];
