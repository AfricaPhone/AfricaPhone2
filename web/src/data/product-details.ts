import { brandLabelById, type CatalogProduct } from "./catalog";

export type ProductDetailContent = {
  gallery: string[];
  longDescription: string;
  sellingPoints: string[];
  specs: { label: string; value: string }[];
};

type ProductDetailOverride = Partial<ProductDetailContent>;

const productDetailOverrides: Record<string, ProductDetailOverride> = {
  "redmi-note-13-pro-256-12": {
    gallery: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1510552776732-01acc9a4cbd0?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=90",
    ],
    longDescription:
      "Avec sa caméra de 200 MP, son écran AMOLED 120 Hz et sa charge rapide 67 W, le Redmi Note 13 Pro 5G réunit tout ce qu'il faut pour rester productif et créatif. AfricaPhone le prépare avec une configuration complète, mise à jour logicielle et garantie locale.",
    sellingPoints: [
      "Capteur photo 200 MP avec night mode amélioré",
      "Écran AMOLED 6,67\" 120 Hz idéal pour le gaming",
      "Charge turbo 67 W et batterie 5100 mAh",
      "Assistance premium AfricaPhone 12 mois",
    ],
    specs: [
      { label: "Écran", value: "6,67\" AMOLED 120 Hz" },
      { label: "Caméra", value: "200 MP + 8 MP + 2 MP" },
      { label: "Batterie", value: "5100 mAh - Charge 67 W" },
      { label: "Processeur", value: "Snapdragon 7s Gen 2" },
    ],
  },
  "tecno-spark-20-pro-plus": {
    gallery: [
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=1200&q=90",
    ],
    longDescription:
      "Le Tecno Spark 20 Pro+ combine un design incurvé élégant et une expérience photo 108 MP propulsée par HiOS. Une option parfaite pour ceux qui veulent un smartphone polyvalent, fluide et prêt pour les réseaux sociaux.",
    sellingPoints: [
      "Design incurvé premium et finition texturée",
      "Capteur 108 MP avec stabilisation AI",
      "Android 14 HiOS fluide et personnalisable",
      "Pack service AfricaPhone : coque, film et prise en main",
    ],
    specs: [
      { label: "Écran", value: "6,78\" AMOLED incurvé 120 Hz" },
      { label: "Caméra", value: "108 MP principale + capteurs AI" },
      { label: "Batterie", value: "5000 mAh + charge 45 W" },
      { label: "Interface", value: "HiOS 13.5 (Android 14)" },
    ],
  },
  "galaxy-a25-5g-128-6": {
    gallery: [
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=90",
    ],
    longDescription:
      "Galaxy A25 5G, c’est la signature Samsung : un écran Super AMOLED éclatant, la 5G et l’écosystème Galaxy. AfricaPhone assure l’installation de vos comptes et la migration de vos données.",
    sellingPoints: [
      "Écran Super AMOLED 6,5\" 90 Hz",
      "Connectivité 5G et performances One UI",
      "Garantie officielle 12 mois AfricaPhone/Samsung",
    ],
  },
};

const FALLBACK_DESCRIPTIONS = [
  "Pensé pour une utilisation quotidienne exigeante, préparé et garanti par AfricaPhone.",
  "Performance, autonomie et accompagnement sur-mesure pour rester connecté en toute confiance.",
];

const FALLBACK_POINTS = [
  "Pré-configuration offerte et assistance WhatsApp 7j/7",
  "Livraison express sur Cotonou et expédition nationale",
];

export function buildProductDetailContent(product: CatalogProduct): ProductDetailContent {
  const override = productDetailOverrides[product.id] ?? {};

  const gallery =
    override.gallery ??
    buildFallbackGallery(product.image);

  const brandLabel = brandLabelById[product.brandId] ?? product.brandId;

  const baseSpecs: { label: string; value: string }[] = [
    { label: "Marque", value: brandLabel },
    { label: "Catégorie", value: product.category },
    { label: "Segment", value: product.segment },
  ];

  if (product.storage) {
    baseSpecs.push({ label: "Capacité", value: product.storage });
  }

  if (product.highlight) {
    baseSpecs.push({ label: "Atout", value: product.highlight });
  }

  const specs = mergeSpecs(baseSpecs, override.specs);

  const defaultSellingPoints = [
    product.highlight ?? FALLBACK_POINTS[0],
    `Stockage ${product.storage}`,
    ...FALLBACK_POINTS,
  ].filter(Boolean) as string[];

  const sellingPoints = override.sellingPoints ?? uniqStrings(defaultSellingPoints);

  const longDescription =
    override.longDescription ??
    product.description ??
    FALLBACK_DESCRIPTIONS[Math.floor(Math.random() * FALLBACK_DESCRIPTIONS.length)];

  return {
    gallery,
    longDescription,
    sellingPoints,
    specs,
  };
}

function mergeSpecs(
  baseSpecs: { label: string; value: string }[],
  override?: { label: string; value: string }[],
) {
  const merged = [...baseSpecs];
  if (override) {
    override.forEach(spec => {
      const existingIndex = merged.findIndex(item => item.label === spec.label);
      if (existingIndex >= 0) {
        merged[existingIndex] = spec;
      } else {
        merged.push(spec);
      }
    });
  }
  return merged;
}

function buildFallbackGallery(primaryImage: string) {
  return primaryImage ? [primaryImage] : [];
}

function uniqStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      return false;
    }
    seen.add(trimmed.toLowerCase());
    return true;
  });
}
