// Export Firestore payments collection to Excel without keeping secrets in the repo.
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const getArg = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
};

const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  getArg('--serviceAccountPath');
if (!serviceAccountPath) {
  console.error(
    'Missing service account path. Set SERVICE_ACCOUNT_PATH or pass --serviceAccountPath "<path/to/key.json>".',
  );
  process.exit(1);
}

const resolvedKeyPath = path.resolve(serviceAccountPath);
if (!fs.existsSync(resolvedKeyPath)) {
  console.error(`Service account file not found at ${resolvedKeyPath}`);
  process.exit(1);
}

const outputPath = path.resolve(getArg('--out') || 'Firebase.xlsx');
const explicitProjectId = getArg('--projectId') || process.env.GOOGLE_CLOUD_PROJECT;

const isTimestamp = (value) => Boolean(value && typeof value.toDate === 'function');
const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return value;
};

const flattenRecord = (obj, parentKey = '') => {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !isTimestamp(value) && !(value instanceof Date)) {
      Object.assign(result, flattenRecord(value, fullKey));
    } else {
      result[fullKey] = formatValue(value);
    }
  });
  return result;
};

const loadServiceAccount = () => {
  try {
    const raw = fs.readFileSync(resolvedKeyPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read or parse the service account file:', error);
    process.exit(1);
  }
};

const initFirestore = () => {
  const serviceAccount = loadServiceAccount();
  const projectId = explicitProjectId || serviceAccount.project_id;
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
  return getFirestore();
};

const toRows = (docs) =>
  docs.map((doc) => {
    const data = flattenRecord(doc.data());
    return { documentId: doc.id, ...data };
  });

const writeWorksheet = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('payments');
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => sheet.addRow(row));
  await workbook.xlsx.writeFile(outputPath);
};

const main = async () => {
  const db = initFirestore();
  console.log(`Exporting payments to ${outputPath}...`);
  const snapshot = await db.collection('payments').get();
  if (snapshot.empty) {
    console.log('No documents found in payments collection.');
    return;
  }
  const rows = toRows(snapshot.docs);
  await writeWorksheet(rows);
  console.log(`Export completed. Rows: ${rows.length}`);
};

main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
