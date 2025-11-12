const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const DEFAULT_CONCURRENCY = toPositiveInt(
  process.env.COPY_STORAGE_CONCURRENCY,
  10
);

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function ensureCredentials() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON file before running this script.'
    );
  }

  const resolvedPath = path.resolve(credentialsPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS points to "${resolvedPath}", but the file does not exist.`
    );
  }

  return resolvedPath;
}

function parseArgs(argv) {
  const args = {
    prefix: '',
    concurrency: DEFAULT_CONCURRENCY,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    switch (current) {
      case '--from':
      case '-f':
        args.sourceBucketName = argv[i + 1];
        i += 1;
        break;
      case '--to':
      case '-t':
        args.destinationBucketName = argv[i + 1];
        i += 1;
        break;
      case '--prefix':
        args.prefix = argv[i + 1] ?? '';
        i += 1;
        break;
      case '--concurrency':
        args.concurrency = toPositiveInt(argv[i + 1], DEFAULT_CONCURRENCY);
        i += 1;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  if (!args.sourceBucketName || !args.destinationBucketName) {
    printUsage();
    throw new Error(
      'Missing required arguments. Provide --from <sourceBucket> and --to <destinationBucket>.'
    );
  }

  if (args.sourceBucketName === args.destinationBucketName) {
    throw new Error('Source and destination buckets must be different.');
  }

  args.concurrency = Math.max(1, args.concurrency);

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/copy-storage-bucket.js --from <sourceBucket> --to <destinationBucket> [options]

Options:
  --prefix <folder/>        Copy only objects under the provided prefix.
  --concurrency <number>    Number of parallel copies (default: ${DEFAULT_CONCURRENCY}).
  --dry-run                 List the files that would be copied without writing.
  -h, --help                Show this message.

Environment:
  GOOGLE_APPLICATION_CREDENTIALS must point to a Firebase Admin service account JSON key.
  COPY_STORAGE_CONCURRENCY overrides the default concurrency level.`);
}

async function assertBucketExists(bucket, label) {
  const [exists] = await bucket.exists();
  if (!exists) {
    throw new Error(`The ${label} bucket "${bucket.name}" does not exist or is inaccessible.`);
  }
}

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function* iterateFiles(bucket, prefix = '') {
  const stream = bucket.getFilesStream(prefix ? { prefix } : undefined);
  for await (const file of stream) {
    yield file;
  }
}

async function scanBucket(bucket, prefix = '', sampleSize = 10) {
  const sample = [];
  let totalFiles = 0;
  let totalBytes = 0;

  for await (const file of iterateFiles(bucket, prefix)) {
    totalFiles += 1;
    const size = Number(file.metadata?.size ?? 0);
    if (Number.isFinite(size)) {
      totalBytes += size;
    }
    if (sample.length < sampleSize) {
      sample.push(file.name);
    }
  }

  return { totalFiles, totalBytes, sample };
}

async function copyFiles({
  sourceBucket,
  destinationBucket,
  prefix,
  concurrency,
  totalFiles,
}) {
  const active = new Set();
  let copied = 0;

  async function schedule(file) {
    const copyPromise = file
      .copy(destinationBucket.file(file.name))
      .then(() => {
        copied += 1;
        if (copied === totalFiles || copied % 25 === 0) {
          if (totalFiles) {
            console.log(`Copied ${copied}/${totalFiles} objects...`);
          } else {
            console.log(`Copied ${copied} objects...`);
          }
        }
      })
      .finally(() => {
        active.delete(copyPromise);
      });

    active.add(copyPromise);
    if (active.size >= concurrency) {
      await Promise.race(active);
    }
  }

  for await (const file of iterateFiles(sourceBucket, prefix)) {
    await schedule(file);
  }

  await Promise.all(active);

  return copied;
}

async function copyBucketContents({
  sourceBucketName,
  destinationBucketName,
  prefix = '',
  concurrency = DEFAULT_CONCURRENCY,
  dryRun = false,
} = {}) {
  ensureCredentials();

  const storage = new Storage();
  const sourceBucket = storage.bucket(sourceBucketName);
  const destinationBucket = storage.bucket(destinationBucketName);

  await assertBucketExists(sourceBucket, 'source');
  await assertBucketExists(destinationBucket, 'destination');

  console.log(
    `Listing objects in gs://${sourceBucketName}/${prefix || ''} ... this might take a moment.`
  );

  const stats = await scanBucket(sourceBucket, prefix);
  const { totalFiles, totalBytes, sample } = stats;

  if (!totalFiles) {
    console.log('Source bucket is empty for the selected prefix. Nothing to copy.');
    return { totalFiles: 0, totalBytes: 0, dryRun };
  }

  console.log(
    `Found ${totalFiles} objects (~${formatBytes(totalBytes)}) to copy to gs://${destinationBucketName}.`
  );

  if (dryRun) {
    console.log('Dry run enabled. No data was copied. Sample objects:');
    sample.forEach((name) => console.log(` - ${name}`));
    if (totalFiles > sample.length) {
      console.log(` ...and ${totalFiles - sample.length} more files.`);
    }
    return { totalFiles, totalBytes, dryRun };
  }

  console.log(`Starting copy with concurrency=${concurrency}...`);
  await copyFiles({
    sourceBucket,
    destinationBucket,
    prefix,
    concurrency,
    totalFiles,
  });
  console.log('Copy completed successfully.');

  return { totalFiles, totalBytes, dryRun };
}

async function main() {
  const args = parseArgs(process.argv);
  await copyBucketContents(args);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Bucket copy failed:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  copyBucketContents,
  parseArgs,
  ensureCredentials,
};
