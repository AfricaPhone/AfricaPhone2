import { DiscoverFeedItem } from '../types';

export const DISCOVER_FEED_DATA: DiscoverFeedItem[] = [
  {
    type: 'hero',
    id: 'hero-1',
    title: 'Studio mobile Galaxy S24',
    subtitle: 'Coaching, accessoires premium et protection instantanée inclus.',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80',
    cta: 'Explorer les nouveautés',
  },
  {
    type: 'product_grid',
    id: 'pg-1',
    title: 'Populaires cette semaine',
    productIds: ['p2', 'p3', 'a2', 'a4'],
  },
  {
    type: 'collection',
    id: 'col-1',
    title: 'Kit photo smartphone',
    productIds: ['p3', 'a1', 'a3', 'au2'],
  },
  {
    type: 'article',
    id: 'art-1',
    title: '5 accessoires indispensables en mobilité',
    excerpt: 'Optimisez votre productivité avec des packs charge rapide, stabilisateur et micro cravate.',
    imageUrl: 'https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=1200&q=80',
  },
  {
    type: 'shop_the_look',
    id: 'stl-1',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    markers: [
      { productId: 'p1', top: '40%', left: '56%' },
      { productId: 'a3', top: '62%', left: '28%' },
      { productId: 'au1', top: '58%', left: '72%' },
    ],
  },
  {
    type: 'product_grid',
    id: 'pg-2',
    title: 'Bundles accessoires',
    productIds: ['a1', 'a2', 'a3', 'a4'],
  },
  {
    type: 'collection',
    id: 'col-2',
    title: 'Charge rapide GaN',
    productIds: ['a1', 'a5', 'p4', 'a6'],
  },
  {
    type: 'hero',
    id: 'hero-2',
    title: 'MagSafe Essentials',
    subtitle: 'Coques, wallets et stands certifiés pour iPhone 15.',
    imageUrl: 'https://images.unsplash.com/photo-1512499617640-c2f999018b72?auto=format&fit=crop&w=1600&q=80',
    cta: 'Composer mon pack',
  },
  {
    type: 'article',
    id: 'art-2',
    title: 'Pourquoi passer au chargeur GaN ?',
    excerpt: 'Plus compact, plus puissant, découvrez comment la technologie GaN protège vos smartphones.',
    imageUrl: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    type: 'shop_the_look',
    id: 'stl-2',
    imageUrl: 'https://images.unsplash.com/photo-1515523110800-9415d13b84fb?auto=format&fit=crop&w=1200&q=80',
    markers: [
      { productId: 'p5', top: '48%', left: '60%' },
      { productId: 'a4', top: '68%', left: '32%' },
      { productId: 'a6', top: '62%', left: '78%' },
    ],
  },
  {
    type: 'product_grid',
    id: 'pg-3',
    title: 'Sélection smartphones 5G',
    productIds: ['p1', 'p4', 'p5', 'p6'],
  },
  {
    type: 'collection',
    id: 'col-3',
    title: 'Audio sans fil',
    productIds: ['au1', 'au2', 'au3', 'au4'],
  },
  {
    type: 'product_grid',
    id: 'pg-4',
    title: 'Protection ultime',
    productIds: ['a5', 'a6', 'a7', 'a8'],
  },
  {
    type: 'hero',
    id: 'hero-3',
    title: 'Trade-In Premium',
    subtitle: 'Reprise immédiate et bonus fidélité sur votre prochain smartphone.',
    imageUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80',
    cta: 'Simuler ma reprise',
  },
];
