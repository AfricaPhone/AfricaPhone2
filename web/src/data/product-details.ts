import type { ProductTile } from "./storefront";
import { productShelves } from "./storefront";

export type ProductDetail = ProductTile & {
  description: string;
  gallery: string[];
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
  services: Array<{ title: string; description: string }>;
  deliveryNotes: string[];
};

const baseProducts: ProductTile[] = productShelves.flatMap(shelf => shelf.items);

const defaultSpecs: Array<{ label: string; value: string }> = [
  { label: "Disponibilité", value: "Stock physique confirmé en boutique AfricaPhone" },
  { label: "Condition", value: "Produit neuf, scellé constructeur" },
  { label: "Garantie", value: "12 mois AfricaCare + assistance locale" },
  { label: "Paiement", value: "Mobile money, carte bancaire, financement Kkiapay" },
];

const defaultServices: Array<{ title: string; description: string }> = [
  {
    title: "Configuration offerte",
    description: "Mise en route complète, transfert Smart Switch et installation des apps essentielles.",
  },
  {
    title: "Assistance premium",
    description: "Support AfricaCare 7j/7 avec remplacement prioritaire en cas de panne couverte.",
  },
  {
    title: "Accessoires adaptés",
    description: "Verre trempé, coque et chargeur recommandés par nos experts disponibles à la boutique.",
  },
];

const detailMap: Record<string, ProductDetail> = baseProducts.reduce((acc, product) => {
  const gallery = [
    product.image,
    `${product.image}${product.image.includes("?") ? "&" : "?"}ref=gallery-front`,
    `${product.image}${product.image.includes("?") ? "&" : "?"}ref=gallery-focus`,
  ];

  acc[product.id] = {
    ...product,
    description: `Découvrez ${product.name}. ${product.tagline}. Profitez d'une prise en charge boutique AfricaPhone avec vérification avant livraison, accessoires adaptés et assistance locale.`,
    gallery,
    highlights: [
      product.tagline,
      product.savings ?? "Assistance AfricaCare et extension garantie 12 mois",
      "Livraison express 24 h sur Grand Cotonou",
    ],
    specs: defaultSpecs,
    services: defaultServices,
    deliveryNotes: [
      "Retrait express en boutique ou livraison à domicile sous 24 h à Cotonou.",
      "Vérification complète avant expédition et emballage sécurisé.",
      "Suivi personnalisé par un conseiller AfricaPhone jusqu'à la réception.",
    ],
  };
  return acc;
}, {} as Record<string, ProductDetail>);

export function getProductDetail(productId: string): ProductDetail | undefined {
  return detailMap[productId];
}

export function listAllProductDetails(): ProductDetail[] {
  return Object.values(detailMap);
}
