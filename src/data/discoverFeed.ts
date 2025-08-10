import { DiscoverFeedItem } from '../types';

export const DISCOVER_FEED_DATA: DiscoverFeedItem[] = [
  {
    type: 'hero',
    id: 'hero-1',
    title: 'Nouvelle Collection Tech',
    subtitle: 'Découvrez les derniers gadgets qui vont changer votre quotidien.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1600',
    cta: 'Explorer maintenant',
  },
  {
    type: 'product_grid',
    id: 'pg-1',
    title: 'Populaires cette semaine',
    productIds: ['p2', 'au1', 'l1', 'a2'],
  },
  {
    type: 'collection',
    id: 'col-1',
    title: 'Le setup parfait pour le télétravail',
    productIds: ['l2', 'a2', 'au3', 'a1'],
  },
  {
    type: 'article',
    id: 'art-1',
    title: '3 raisons de passer au sans-fil',
    excerpt: 'Libérez-vous des câbles et découvrez une nouvelle façon de vivre la technologie. De vos écouteurs à votre chargeur...',
    imageUrl: 'https://images.unsplash.com/photo-1618384887924-3672943361a2?q=80&w=800',
  },
  {
    type: 'shop_the_look',
    id: 'stl-1',
    imageUrl: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1200',
    markers: [
      { productId: 'l3', top: '45%', left: '50%' },
      { productId: 'p3', top: '65%', left: '25%' },
      { productId: 'au2', top: '60%', left: '75%' },
    ],
  },
  {
    type: 'product_grid',
    id: 'pg-2',
    title: 'Nouveautés Audio',
    productIds: ['au1', 'au2', 'au3', 'au4'],
  },
  {
    type: 'collection',
    id: 'col-2',
    title: 'Indispensables pour le voyage',
    productIds: ['au1', 'a4', 'p4', 'a1'],
  },
];
