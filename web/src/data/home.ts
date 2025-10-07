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
