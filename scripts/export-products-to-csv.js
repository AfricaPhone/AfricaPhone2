const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
);
const OUTPUT_DIR = path.resolve(__dirname, '../product_exports');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'products_prix_vente.csv');

const loadServiceAccount = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Service account introuvable: ${SERVICE_ACCOUNT_PATH}`);
  }
  const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
  return JSON.parse(raw);
};

const initFirebaseApp = () => {
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  return admin.firestore();
};

const parsePrice = value => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return '';
};

const escapeCsvValue = value => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = rows => {
  const header = ['id', 'name', 'price', 'oldPrice', 'brand', 'category', 'enPromotion', 'isVedette'];
  const lines = [
    header.join(','),
    ...rows.map(row => header.map(key => escapeCsvValue(row[key])).join(',')),
  ];
  return lines.join('\n');
};

const fetchProducts = async db => {
  const snapshot = await db.collection('products').get();
  return snapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      name: data.name || data.title || '',
      price: parsePrice(data.price ?? data.prix ?? data.prixVente),
      oldPrice: parsePrice(data.oldPrice ?? data.old_price ?? data.prixAncien),
      brand: data.brand || data.brandId || '',
      category: data.category || '',
      enPromotion: Boolean(data.enPromotion),
      isVedette: Boolean(data.ordreVedette && data.ordreVedette > 0),
    };
  });
};

const ensureOutputDir = () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
};

const main = async () => {
  const db = initFirebaseApp();
  console.log('Lecture des produits Firestore…');
  const products = await fetchProducts(db);
  console.log(`→ ${products.length} produits récupérés.`);

  products.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  ensureOutputDir();
  const csv = toCsv(products);
  fs.writeFileSync(OUTPUT_PATH, csv, 'utf8');
  console.log(`CSV sauvegardé dans ${OUTPUT_PATH}`);
};

main().catch(error => {
  console.error('Erreur pendant l’export:', error);
  process.exit(1);
});
