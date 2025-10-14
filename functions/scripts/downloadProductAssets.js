// scripts/downloadProductAssets.js
// Fetch Firestore products, download associated images, and organise outputs
// by category (accessories, tablets, phones, others).

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const admin = require('firebase-admin');

const serviceAccountPath = path.resolve(
  __dirname,
  '../../africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
);
const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
}

const db = admin.firestore();
const storage = admin.storage();

const OUTPUT_ROOT = path.resolve(__dirname, '../../product_exports');
const CATEGORY_KEYS = ['accessories', 'tablets', 'phones', 'others'];

const CATEGORY_OUTPUTS = CATEGORY_KEYS.reduce((acc, key) => {
  const dir = path.join(OUTPUT_ROOT, key);
  acc[key] = {
    key,
    dir,
    imagesDir: path.join(dir, 'images'),
    jsonPath: path.join(dir, 'products.json'),
    products: [],
  };
  return acc;
}, {});

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/bmp': '.bmp',
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const normalizeString = value =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const sanitizeFilename = (value, fallback) => {
  const normalized = normalizeString(value || fallback || 'image')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : fallback || 'image';
};

const parseNumeric = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').match(/[\d.]+/g);
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized.join(''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatCapacityLabel = (label, value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = parseNumeric(value);
  if (numeric) {
    return `${label}${numeric}go`;
  }

  const raw = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  return raw.length > 0 ? `${label}${raw}` : null;
};

const extractSpecificationCapacity = data => {
  if (!Array.isArray(data?.specifications)) {
    return null;
  }

  const candidates = data.specifications
    .map(spec => {
      const key = spec?.key ?? '';
      const value = spec?.value ?? '';
      return `${key} ${value}`.trim();
    })
    .filter(Boolean);

  const joined = candidates.join(' ').toLowerCase();
  const match = joined.match(/(\d+)\s*(?:gb|go)\s*(?:de)?\s*rom.*?(\d+)\s*(?:gb|go)\s*(?:de)?\s*ram/);
  if (match) {
    return `rom${match[1]}go ram${match[2]}go`;
  }

  const singleMatch = joined.match(/(\d+)\s*(?:gb|go)/);
  if (singleMatch) {
    return `rom${singleMatch[1]}go`;
  }

  return null;
};

const buildVariantSuffix = (data, categoryKey) => {
  if (categoryKey !== 'phones') {
    return null;
  }

  const parts = [];

  const romLabel = formatCapacityLabel('rom', data?.rom ?? data?.storage ?? data?.memoire);
  if (romLabel) {
    parts.push(romLabel);
  }

  let ramLabel = formatCapacityLabel('ram', data?.ram);
  if (!ramLabel) {
    const ramBase = formatCapacityLabel('ram-base', data?.ram_base);
    const ramExt = formatCapacityLabel('ram-ext', data?.ram_extension);
    if (ramBase || ramExt) {
      if (ramBase && ramExt) {
        parts.push(`ram${ramBase.replace('ram-base', '')}+${ramExt.replace('ram-ext', '')}`);
      } else if (ramBase) {
        parts.push(`ram${ramBase.replace('ram-base', '')}`);
      } else if (ramExt) {
        parts.push(`ram${ramExt.replace('ram-ext', '')}`);
      }
    }
  } else {
    parts.push(ramLabel);
  }

  if (parts.length === 0) {
    const fromSpecs = extractSpecificationCapacity(data);
    if (fromSpecs) {
      parts.push(fromSpecs);
    }
  }

  return parts.length > 0 ? parts.join(' ') : null;
};

const ensureDir = async dir => {
  await fsp.mkdir(dir, { recursive: true });
};

const ensureOutputs = async () => {
  await fsp.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await ensureDir(OUTPUT_ROOT);

  for (const { dir, imagesDir } of Object.values(CATEGORY_OUTPUTS)) {
    await ensureDir(dir);
    await ensureDir(imagesDir);
  }
};

const pathExists = async targetPath => {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const reserveFileName = async (dir, fileName) => {
  let attempt = 0;
  let candidateName = fileName;
  let targetPath = path.join(dir, candidateName);

  while (await pathExists(targetPath)) {
    attempt += 1;
    const { name, ext } = path.parse(fileName);
    candidateName = `${name}-${attempt}${ext}`;
    targetPath = path.join(dir, candidateName);
  }

  return targetPath;
};

const toPosixPath = value => (value ? value.split(path.sep).join('/') : value);

const parseGsUrl = source => {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(source);
  if (!match) {
    return null;
  }

  return {
    bucket: match[1],
    objectPath: match[2],
  };
};

const inferExtension = (urlPath, contentType) => {
  const cleanPath = (urlPath || '').split('?')[0].split('#')[0];
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(cleanPath);
  if (extMatch) {
    return `.${extMatch[1].toLowerCase()}`;
  }

  if (contentType && MIME_EXTENSION_MAP[contentType.toLowerCase()]) {
    return MIME_EXTENSION_MAP[contentType.toLowerCase()];
  }

  return '.bin';
};

const downloadFromHttp = async (imageUrl, destinationPath, baseName) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const extension = inferExtension(imageUrl, response.headers.get('content-type'));
  const fileName = `${baseName}${extension}`;
  const outputPath = await reserveFileName(destinationPath, fileName);
  await fsp.writeFile(outputPath, Buffer.from(arrayBuffer));
  return { outputPath, extension };
};

const downloadFromStorage = async (objectRef, destinationPath, baseName) => {
  const { bucket: bucketName, objectPath } = objectRef;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const cleanedObjectPath = objectPath.replace(/^\/+/, '');
  const [metadata] = await bucket.file(cleanedObjectPath).getMetadata().catch(() => [null]);
  const extension = inferExtension(cleanedObjectPath, metadata?.contentType);

  const fileName = `${baseName}${extension}`;
  const outputPath = await reserveFileName(destinationPath, fileName);
  await bucket.file(cleanedObjectPath).download({ destination: outputPath });
  return { outputPath, extension };
};

const resolveImageSource = data => {
  if (typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0) {
    return data.imageUrl.trim();
  }
  if (typeof data.image === 'string' && data.image.trim().length > 0) {
    return data.image.trim();
  }
  if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    const candidate = data.imageUrls.find(item => typeof item === 'string' && item.trim().length > 0);
    if (candidate) {
      return candidate.trim();
    }
  }
  return null;
};

const serialiseFirestoreData = data => JSON.parse(JSON.stringify(data));

const classifyProduct = data => {
  const candidates = [data?.category, data?.segment, data?.type, data?.family];
  const haystack = normalizeString(candidates.filter(Boolean).join(' '));

  if (haystack.includes('accessoire')) {
    return 'accessories';
  }
  if (haystack.includes('tablette')) {
    return 'tablets';
  }
  if (
    haystack.includes('smartphone') ||
    haystack.includes('portable') ||
    haystack.includes('telephone') ||
    haystack.includes('mobile')
  ) {
    return 'phones';
  }

  return 'others';
};

const buildProductRecord = (docId, rawData, imageSource, imagePaths, categoryKey, variantSuffix) => {
  const plain = serialiseFirestoreData(rawData);

  return {
    id: docId,
    name: plain.name ?? null,
    price: plain.price ?? null,
    brand: plain.brand ?? null,
    category: categoryKey,
    firestoreCategory: plain.category ?? null,
    variantSuffix: variantSuffix ?? null,
    capacities: {
      rom: plain.rom ?? null,
      ram: plain.ram ?? null,
      ram_base: plain.ram_base ?? null,
      ram_extension: plain.ram_extension ?? null,
    },
    imageSource,
    localImage: imagePaths?.localPathCategory ?? null,
    localImageFromRoot: imagePaths?.localPathRoot ?? null,
    firestoreData: plain,
  };
};

const downloadImageForProduct = async (docId, data, categoryKey, categoryDir, imagesDir) => {
  const imageSource = resolveImageSource(data);
  const variantSuffix = buildVariantSuffix(data, categoryKey);
  const baseNameRaw = [data?.name, variantSuffix].filter(Boolean).join(' ');
  const safeBaseName = sanitizeFilename(baseNameRaw, docId);
  if (!imageSource) {
    console.warn(`Skipping image download for ${docId} (no image source)`);
    return { imageSource: null, localPathCategory: null, localPathRoot: null, variantSuffix };
  }

  try {
    let outputPath = null;

    if (/^https?:\/\//i.test(imageSource)) {
      ({ outputPath } = await downloadFromHttp(imageSource, imagesDir, safeBaseName));
    } else if (imageSource.startsWith('gs://')) {
      const gsInfo = parseGsUrl(imageSource);
      if (!gsInfo) {
        console.warn(`Invalid gs:// URL for ${docId}: ${imageSource}`);
        return { imageSource, localPathCategory: null, localPathRoot: null };
      }
      ({ outputPath } = await downloadFromStorage(gsInfo, imagesDir, safeBaseName));
    } else {
      const gsInfo = { bucket: null, objectPath: imageSource };
      ({ outputPath } = await downloadFromStorage(gsInfo, imagesDir, safeBaseName));
    }

    return {
      imageSource,
      variantSuffix,
      localPathCategory: toPosixPath(path.relative(categoryDir, outputPath)),
      localPathRoot: toPosixPath(path.relative(OUTPUT_ROOT, outputPath)),
    };
  } catch (error) {
    console.error(`Failed to download image for ${docId}: ${error.message}`);
    await sleep(250);
    return { imageSource, variantSuffix, localPathCategory: null, localPathRoot: null };
  }
};

const main = async () => {
  await ensureOutputs();

  const snapshot = await db.collection('products').get();
  console.log(`Found ${snapshot.size} products in Firestore`);

  const allProducts = [];
  let processed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const categoryKey = classifyProduct(data);
    const bucket = CATEGORY_OUTPUTS[categoryKey] ?? CATEGORY_OUTPUTS.others;
    const imageInfo = await downloadImageForProduct(doc.id, data, bucket.key, bucket.dir, bucket.imagesDir);

    const record = buildProductRecord(
      doc.id,
      data,
      imageInfo.imageSource,
      imageInfo,
      bucket.key,
      imageInfo.variantSuffix
    );
    bucket.products.push(record);
    allProducts.push(record);

    processed += 1;
    if (processed % 10 === 0 || processed === snapshot.size) {
      console.log(`Processed ${processed} / ${snapshot.size} products`);
    }
  }

  for (const output of Object.values(CATEGORY_OUTPUTS)) {
    await fsp.writeFile(output.jsonPath, JSON.stringify(output.products, null, 2), 'utf8');
  }

  const allProductsPath = path.join(OUTPUT_ROOT, 'all-products.json');
  await fsp.writeFile(allProductsPath, JSON.stringify(allProducts, null, 2), 'utf8');

  const summary = {
    total: allProducts.length,
    categories: Object.fromEntries(
      Object.values(CATEGORY_OUTPUTS).map(output => [
        output.key,
        {
          count: output.products.length,
          json: toPosixPath(path.relative(OUTPUT_ROOT, output.jsonPath)),
          imagesDir: toPosixPath(path.relative(OUTPUT_ROOT, output.imagesDir)),
        },
      ])
    ),
  };

  const summaryPath = path.join(OUTPUT_ROOT, 'summary.json');
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`Export complete: ${allProducts.length} products written to ${allProductsPath}`);
};

main()
  .then(() => {
    console.log('All done.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error while exporting products:', error);
    process.exit(1);
  });

