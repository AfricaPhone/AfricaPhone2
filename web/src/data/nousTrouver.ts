export type LocationInfo = {
  city: string;
  address: string;
  hours: string;
  phone: string;
};

export type SupportChannel = {
  label: string;
  value: string;
  href: string;
};

export type GalleryImage = {
  src: string;
  alt: string;
};

export const locations: LocationInfo[] = [
  {
    city: 'Cotonou',
    address: 'Immeuble AfricaPhone, Rue 352, Quartier Ganhi',
    hours: 'Lundi - Samedi, 9h00 - 19h00',
    phone: '+229 01 54 15 15 22',
  },
  {
    city: 'Abomey-Calavi',
    address: 'Showroom Universite, Voie d Abomey-Calavi',
    hours: 'Lundi - Vendredi, 10h00 - 18h30',
    phone: '+229 54 15 15 22',
  },
  {
    city: 'Parakou',
    address: 'Boutique Parakou Center, Avenue de la Liberte',
    hours: 'Mardi - Samedi, 9h30 - 18h00',
    phone: '+229 61 15 15 22',
  },
];

export const supportChannels: SupportChannel[] = [
  {
    label: 'Service WhatsApp',
    value: '+229 01 54 15 15 22',
    href: 'https://wa.me/2290154151522',
  },
  {
    label: 'Service client',
    value: '+229 54 15 15 22',
    href: 'tel:+22954151522',
  },
  {
    label: 'Email',
    value: 'support@africaphone.com',
    href: 'mailto:support@africaphone.com',
  },
];

export const galleryImages: GalleryImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
    alt: 'Showroom principal AfricaPhone avec comptoir et equipes autour des smartphones',
  },
  {
    src: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80',
    alt: 'Vitrine lumineuse presentant plusieurs telephones et tablettes',
  },
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    alt: 'Espace d accueil client avec zone de conseil personnalise',
  },
];
