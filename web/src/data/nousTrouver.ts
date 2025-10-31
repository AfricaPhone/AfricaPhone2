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
  contactLine: 'Appel & WhatsApp : +229 54 15 15 22',
  address: 'Immeuble AfricaPhone, Rue 352, Ganhi - Cotonou, Benin',
  mapLink: 'https://maps.google.com/?q=Immeuble+AfricaPhone+Ganhi',
  contact: {
    phone: '+229 54 15 15 22',
    whatsapp: '+229 54 15 15 22',
    whatsappLink: 'https://wa.me/22954151522',
    email: 'support@africaphone.com',
  },
  openingHours: [
    { label: 'Lundi - Samedi', value: '09:00 - 19:00' },
    { label: 'Dimanche', value: '10:00 - 17:00 (assistance distante)' },
  ],
  description: [
    'Notre showroom AfricaPhone Ganhi vous accueille pour decouvrir les dernieres nouveautes mobiles, comparer les gammes et profiter de conseils personnalises de nos experts.',
    'Chaque visite inclut un diagnostic offert, le transfert de vos donnees et une mise en service complete afin que vous repartiez serein avec votre nouvel appareil.',
  ],
  services: [
    {
      title: 'Configuration express',
      description: 'Transfert de donnees, parametres de securite et installation des applications indispensables en moins de 30 minutes.',
    },
    {
      title: 'Reparation et garantie',
      description: 'Atelier sur place pour le remplacement d ecran, de batterie et la gestion de votre garantie AfricaCare.',
    },
    {
      title: 'Financement flexible',
      description: 'Solutions Kkiapay et partenaires bancaires pour etaler l achat de votre smartphone ou pack entreprise.',
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
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.479638142375!2d2.432964375831585!3d6.462064623576394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1023574372053ac7%3A0x7d4f4f667a212f2d!2sGanhi%2C%20Cotonou%2C%20Benin!5e0!3m2!1sen!2sbj!4v1718035200000!5m2!1sen!2sbj',
};
