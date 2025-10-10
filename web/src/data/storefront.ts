export type NavShortcut = {
  label: string;
  href: string;
  badge?: string;
};

export const deliveryLocation = {
  label: 'Expedier vers',
  city: 'Cotonou',
  note: 'Livraison 24 h sur Grand Cotonou',
} as const;

export const topNavShortcuts: NavShortcut[] = [
  { label: 'Bonjour, connectez-vous', href: '#account', badge: 'Compte & listes' },
  { label: 'Retours', href: '#orders', badge: 'Commandes et suivi' },
  { label: 'Service pro', href: '#business' },
] as const;

export const departments = [
  { label: 'Tous', href: '#departments' },
  { label: 'Offres du jour', href: '#deals' },
  { label: 'Smartphones', href: '#smartphones' },
  { label: 'Tablettes', href: '#tablettes' },
  { label: 'Audio', href: '#audio' },
  { label: 'Accessoires', href: '#accessoires' },
  { label: 'Reconditionnes', href: '#renewed' },
  { label: 'Services tech', href: '#services' },
  { label: 'Financement', href: '#finance' },
  { label: 'Reparations', href: '#support' },
  { label: 'Ambassadeurs', href: '#community' },
] as const;

export const heroBanner = {
  tag: 'AfricaPhone Prime',
  title: 'Votre boutique premium de smartphones et accessoires',
  description:
    'Stock physique garanti, configuration avant livraison et assistance locale pour chaque appareil. Nos experts vous conseillent comme en boutique, directement en ligne.',
  ctaPrimary: { label: 'Explorer les nouveautes', href: '#deals' },
  ctaSecondary: { label: 'Prendre rendez-vous boutique', href: '#services' },
  image:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
  highlights: [
    'Livraison express 24 h',
    'Reprise & financement Kkiapay',
    'Assistance apres-vente AfricaCare',
  ],
} as const;

export type ProductTile = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  oldPrice?: string;
  savings?: string;
  badge?: string;
  rating: number;
  reviews: number;
  image: string;
  href: string;
};

export type ProductShelf = {
  id: string;
  title: string;
  subtitle: string;
  cta: NavShortcut;
  anchor: string;
  items: ProductTile[];
};

export const productShelves: ProductShelf[] = [
  {
    id: 'deals',
    anchor: 'deals',
    title: 'Offres du jour',
    subtitle: 'Remises immediates sur nos stocks garantis.',
    cta: { label: 'Voir toutes les offres', href: '#deals' },
    items: [
      {
        id: 'galaxy-s24-ultra',
        name: 'Galaxy S24 Ultra 512 Go',
        tagline: 'Bundle AfricaCare + verre trempe',
        price: '759 900 FCFA',
        oldPrice: '829 900 FCFA',
        savings: 'Economisez 70 000 FCFA',
        badge: 'Prime',
        rating: 4.9,
        reviews: 182,
        image:
          'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'iphone-15-plus',
        name: 'iPhone 15 Plus 256 Go',
        tagline: 'Coloris Bleu, scelle Apple',
        price: '699 900 FCFA',
        oldPrice: '749 900 FCFA',
        savings: 'Economisez 50 000 FCFA',
        badge: 'Stock magasin',
        rating: 4.8,
        reviews: 134,
        image:
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'poco-x6-pro',
        name: 'Poco X6 Pro 12/512 Go',
        tagline: 'Ecran AMOLED 120 Hz',
        price: '259 900 FCFA',
        oldPrice: '299 900 FCFA',
        savings: 'Economisez 40 000 FCFA',
        badge: 'Deal du jour',
        rating: 4.7,
        reviews: 204,
        image:
          'https://images.unsplash.com/photo-1604161545028-6c2b3f9c9450?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'itel-p55',
        name: 'Itel P55 5G',
        tagline: 'Batterie 5000 mAh + charge 45 W',
        price: '129 900 FCFA',
        oldPrice: '149 900 FCFA',
        savings: 'Economisez 20 000 FCFA',
        badge: 'Nouveaute',
        rating: 4.6,
        reviews: 98,
        image:
          'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'tecno-spark-20-pro',
        name: 'Tecno Spark 20 Pro+',
        tagline: 'Cam double 108 MP',
        price: '179 900 FCFA',
        oldPrice: '199 900 FCFA',
        savings: 'Economisez 20 000 FCFA',
        badge: 'Prime',
        rating: 4.5,
        reviews: 121,
        image:
          'https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'galaxy-a35',
        name: 'Galaxy A35 8/256 Go',
        tagline: 'Etanche IP67 + Samsung Care',
        price: '249 900 FCFA',
        oldPrice: '279 900 FCFA',
        savings: 'Economisez 30 000 FCFA',
        badge: 'Selection boutique',
        rating: 4.6,
        reviews: 76,
        image:
          'https://images.unsplash.com/photo-1512496130939-2c4f79935e4f?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'ipad-air-m1',
        name: 'iPad Air M1 256 Go Wi-Fi',
        tagline: 'Livraison premium + Smart Folio',
        price: '499 900 FCFA',
        oldPrice: '549 900 FCFA',
        savings: 'Economisez 50 000 FCFA',
        badge: 'Pack pro',
        rating: 4.9,
        reviews: 88,
        image:
          'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'bose-quietcomfort-ultra',
        name: 'Bose QuietComfort Ultra',
        tagline: 'Reduction active + audio spatial',
        price: '289 900 FCFA',
        oldPrice: '329 900 FCFA',
        savings: 'Economisez 40 000 FCFA',
        badge: 'Audio',
        rating: 4.8,
        reviews: 55,
        image:
          'https://images.unsplash.com/photo-1512054502226-69b79ce2e69e?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
    ],
  },
  {
    id: 'selection',
    anchor: 'smartphones',
    title: 'Selection AfricaPhone',
    subtitle: 'Les smartphones les plus demandes par nos clients boutique.',
    cta: { label: 'Voir toute la boutique', href: '#smartphones' },
    items: [
      {
        id: 'redmi-note-13-pro',
        name: 'Redmi Note 13 Pro 5G',
        tagline: 'Cam 200 MP + charge 67 W',
        price: '219 900 FCFA',
        badge: 'Best seller',
        rating: 4.7,
        reviews: 312,
        image:
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'infinix-zero-30',
        name: 'Infinix Zero 30 5G',
        tagline: 'Videos 4K selfi + 12 Go RAM',
        price: '239 900 FCFA',
        badge: 'Creator friendly',
        rating: 4.5,
        reviews: 163,
        image:
          'https://images.unsplash.com/photo-1549921296-3ecf396e6e19?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'samsung-zflip5',
        name: 'Galaxy Z Flip5',
        tagline: 'Ecran externe Flex Window',
        price: '679 900 FCFA',
        badge: 'Innovation',
        rating: 4.6,
        reviews: 74,
        image:
          'https://images.unsplash.com/photo-1592899677977-9c10ca58807f?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'tecno-camon-30',
        name: 'Tecno Camon 30 Premier',
        tagline: 'Partenariat Leica + mode portrait',
        price: '299 900 FCFA',
        badge: 'Nouveaute',
        rating: 4.4,
        reviews: 58,
        image:
          'https://images.unsplash.com/photo-1529336953121-ad569cc01c33?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'oneplus-12r',
        name: 'OnePlus 12R 16/256 Go',
        tagline: 'Charge 100 W + OxygenOS',
        price: '379 900 FCFA',
        badge: 'Performance',
        rating: 4.8,
        reviews: 65,
        image:
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'realme-12',
        name: 'Realme 12+ 5G',
        tagline: 'Capteur Sony LYT-600',
        price: '199 900 FCFA',
        badge: 'Value',
        rating: 4.3,
        reviews: 41,
        image:
          'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
    ],
  },
  {
    id: 'accessories',
    anchor: 'accessoires',
    title: 'Accessoires indispensables',
    subtitle: 'Boostez votre setup avec nos accessoires approves en boutique.',
    cta: { label: 'Voir tous les accessoires', href: '#accessoires' },
    items: [
      {
        id: 'anker-powerbank',
        name: 'Batterie Anker 20K 65 W',
        tagline: 'Recharge 3 appareils simultanement',
        price: '69 900 FCFA',
        badge: 'Power delivery',
        rating: 4.8,
        reviews: 93,
        image:
          'https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'dji-osmo-se',
        name: 'DJI Osmo Mobile SE',
        tagline: 'Stabilisateur smartphone 3 axes',
        price: '119 900 FCFA',
        badge: 'Creator',
        rating: 4.7,
        reviews: 57,
        image:
          'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'apple-airpods-pro',
        name: 'AirPods Pro 2 USB-C',
        tagline: 'Audio spatial + reduction active',
        price: '179 900 FCFA',
        badge: 'Apple',
        rating: 4.9,
        reviews: 201,
        image:
          'https://images.unsplash.com/photo-1588422333078-6885f4962855?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'sony-wh-1000xm5',
        name: 'Sony WH-1000XM5',
        tagline: 'Casque premium Bluetooth',
        price: '319 900 FCFA',
        badge: 'Audio',
        rating: 4.8,
        reviews: 146,
        image:
          'https://images.unsplash.com/photo-1465145498025-928c7c83d69b?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'belkin-3in1',
        name: 'Chargeur Belkin 3-en-1 MagSafe',
        tagline: 'iPhone + Watch + AirPods',
        price: '129 900 FCFA',
        badge: 'Desk setup',
        rating: 4.6,
        reviews: 44,
        image:
          'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
      {
        id: 'marshall-acton-iii',
        name: 'Marshall Acton III',
        tagline: 'Enceinte Bluetooth vintage',
        price: '219 900 FCFA',
        badge: 'Lifestyle',
        rating: 4.7,
        reviews: 32,
        image:
          'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=640&q=80',
        href: '#',
      },
    ],
  },
] as const;

export type Spotlight = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

export const spotlights: Spotlight[] = [
  {
    id: 'tecno',
    title: 'Univers Tecno Phantom',
    description: 'Decouvrez nos exclusivites Phantom Ultimate avec livraison premium et accessoires offerts.',
    image:
      'https://images.unsplash.com/photo-1609250291996-0a5f7f0cc761?auto=format&fit=crop&w=800&q=80',
    href: '#',
  },
  {
    id: 'infinix',
    title: 'Infinix Gaming Lab',
    description: 'Zero Ultra, GT 20 Pro et accessoires e-sport selectionnes par nos coaches.',
    image:
      'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=800&q=80',
    href: '#',
  },
  {
    id: 'samsung',
    title: 'Experience Galaxy',
    description: 'Essayez nos foldables en boutique et beneficiez de la configuration Smart Switch incluse.',
    image:
      'https://images.unsplash.com/photo-1595233451831-2c1b3c4d7e90?auto=format&fit=crop&w=800&q=80',
    href: '#',
  },
] as const;

export const voteContestCard = {
  tag: 'Vote & gagne',
  title: 'Concours AfricaPhone Awards',
  description:
    'Soutenez votre journaliste tech prefere et tentez de gagner un smartphone offert par AfricaPhone.',
  bullets: [
    'Votes en temps reel, resultat publie chaque semaine',
    'Recevez un bon d achat si votre candidate arrive dans le top 3',
    'Partagez votre vote et doublez vos chances au tirage final',
  ],
  cta: { label: 'Voter maintenant', href: '#vote' },
  image:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
} as const;

export const predictionCard = {
  tag: 'Jeu pronostics',
  title: 'Donne ton score exact et gagne gratuitement',
  description:
    'AfricaPhone organise un grand jeu de pronostics pour te faire gagner gratuitement des telephones. Pronostique le Classico, confirme tes coordonnees et suis les resultats en direct dans l application.',
  bullets: [
    'Participation 100 % gratuite pour les membres AfricaPhone',
    'Bonus AfricaCare offert aux gagnants du score exact',
    'Partage ton pronostic WhatsApp pour debloquer un cadeau mystere',
  ],
  cta: { label: 'Tenter ma chance', href: '#pronostic' },
  image:
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
} as const;

export type ServiceHighlight = {
  id: string;
  title: string;
  description: string;
  icon: 'delivery' | 'setup' | 'finance' | 'support';
};

export const serviceHighlights: ServiceHighlight[] = [
  {
    id: 'delivery',
    title: 'Livraison express 24 h',
    description: 'Moto livreur AfricaPhone avec verification sur place et essai avant signature.',
    icon: 'delivery',
  },
  {
    id: 'setup',
    title: 'Configuration incluse',
    description: 'Transfert de donnees, pose verre trempe et creation comptes en boutique ou a domicile.',
    icon: 'setup',
  },
  {
    id: 'finance',
    title: 'Financement Kkiapay',
    description: 'Payez en 3 ou 6 fois apres accord sous 3 minutes, disponible sur tout le catalogue.',
    icon: 'finance',
  },
  {
    id: 'support',
    title: 'Support AfricaCare',
    description: 'Diagnostic WhatsApp, pret de telephone et suivi reparation en temps reel.',
    icon: 'support',
  },
] as const;

export const footerColumns = [
  {
    title: 'AfricaPhone',
    links: [
      { label: 'Qui sommes-nous ?', href: '#about' },
      { label: 'Boutiques et horaires', href: '#stores' },
      { label: 'Programme ambassadeur', href: '#community' },
      { label: 'Recrutement', href: '#jobs' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { label: 'Suivre ma commande', href: '#orders' },
      { label: 'Prendre rendez-vous', href: '#services' },
      { label: 'Questions frequentes', href: '#faq' },
      { label: 'Support WhatsApp 01 54 15 15 22', href: '#contact' },
    ],
  },
  {
    title: 'Services premium',
    links: [
      { label: 'AfricaCare', href: '#support' },
      { label: 'Financement et reprise', href: '#finance' },
      { label: 'Solutions entreprises', href: '#business' },
      { label: 'Studio createurs', href: '#creator' },
    ],
  },
] as const;

export const footerLegal = [
  { label: 'Conditions generales de vente', href: '#cgv' },
  { label: 'Politique de confidentialite', href: '#privacy' },
  { label: 'Parametres cookies', href: '#cookies' },
] as const;
