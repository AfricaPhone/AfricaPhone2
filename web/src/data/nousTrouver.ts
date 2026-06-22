export type StoreService = {
  title: string;
  description: string;
};

export type StoreHighlight = {
  title: string;
  description: string;
};

export type GalleryImage = {
  src: string;
  alt: string;
};

export type StoreOverview = {
  name: string;
  category: string;
  tagline: string;
  profileDescription: string;
  followersCount: string;
  followingCount: string;
  catalogUrl: string;
  catalogLabel: string;
  coverImage: string;
  logo: string;
  contactLine: string;
  address: string;
  mapLink: string;
  contact: {
    phone: string;
    whatsapp: string;
    whatsappLink: string;
    email: string;
  };
  openingHours: Array<{ label: string; value: string }>;
  description: string[];
  services: StoreService[];
  highlights: StoreHighlight[];
  gallery: GalleryImage[];
  mapEmbed: string;
};

export type SupportChannel = {
  label: string;
  value: string;
  href: string;
};

export const storeOverview: StoreOverview = {
  name: 'Africa PHONE',
  category: 'Boutique officielle',
  tagline: 'Votre reference pour les smartphones et accessoires en Afrique.',
  profileDescription:
    'AFRICA PHONE est la meilleure marque de distribution de telephones et accessoires en Afrique (PRIX TRES REDUITS).',
  followersCount: '1.5K followers',
  followingCount: '218 following',
  catalogUrl: 'https://africaphone-africaphone.web.app/',
  catalogLabel: 'https://africaphone-africaphone.web.app/',
  coverImage: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=2000&q=80',
  logo: '/logo.png',
  contactLine: 'Appel & WhatsApp : +229 01 54 15 15 22',
  address: 'Abomey-Calavi, voie pavee Parana vers SOS, pres de la Chapelle des Vainqueurs, Benin',
  mapLink:
    'https://maps.google.com/?q=voie+pavee+Parana+Chapelle+des+Vainqueurs+Abomey-Calavi+Benin',
  contact: {
    phone: '+229 01 54 15 15 22',
    whatsapp: '+229 01 54 15 15 22',
    whatsappLink: 'https://wa.me/2290154151522',
    email: 'support@africaphone.com',
  },
  openingHours: [
    { label: 'Tous les jours', value: '08:00 - 00:00' },
    { label: 'Assistance', value: 'WhatsApp disponible avant visite' },
  ],
  description: [
    'Notre showroom AfricaPhone Ganhi vous accueille pour decouvrir les dernieres nouveautes mobiles, comparer les gammes et profiter de conseils personnalises de nos experts.',
    'Chaque achat peut inclure le transfert de vos donnees et une mise en service complete afin que vous repartiez serein avec votre nouvel appareil.',
  ],
  services: [
    {
      title: 'Configuration express',
      description: 'Transfert de donnees, parametres de securite et installation des applications indispensables en moins de 30 minutes.',
    },
    {
      title: 'Garantie et suivi achat',
      description: 'Facture, garantie constructeur et accompagnement apres achat selon le produit choisi.',
    },
    {
      title: 'Paiement flexible',
      description: 'Paiement Kkiapay, retrait boutique, livraison et cotisation selon le parcours choisi.',
    },
  ],
  highlights: [
    {
      title: 'Stock verifie',
      description: 'Produits scelles avec facture officielle et garantie constructeur, disponibles immediatement en boutique.',
    },
    {
      title: 'Equipe d experts',
      description: 'Conseillers formes en continu sur les marques Apple, Samsung, Tecno, Infinix et les accessoires premium.',
    },
    {
      title: 'Espace experience',
      description: 'Corner dedie pour tester casques, montres connectees et solutions domotiques avant achat.',
    },
  ],
  gallery: [
    {
      src: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80',
      alt: 'Facade de la boutique AfricaPhone Ganhi',
    },
    {
      src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
      alt: 'Espace conseil AfricaPhone',
    },
    {
      src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      alt: 'Selection d accessoires AfricaPhone',
    },
  ],
  mapEmbed:
    'https://maps.google.com/maps?q=voie%20pavee%20Parana%20Chapelle%20des%20Vainqueurs%20Abomey-Calavi%20Benin&z=16&output=embed',
};
