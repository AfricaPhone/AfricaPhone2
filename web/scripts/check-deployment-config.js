/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');

const parseEnvFile = filePath => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
};

const env = {
  ...process.env,
  ...parseEnvFile(path.join(webRoot, '.env')),
  ...parseEnvFile(path.join(webRoot, '.env.local')),
};

const args = new Set(process.argv.slice(2));
const forceLive = args.has('--live');
const forceSandbox = args.has('--sandbox');

const readFirst = names => {
  const name = names.find(candidate => String(env[candidate] || '').trim().length > 0);
  return name ? String(env[name]).trim() : null;
};
const isTrue = value => String(value || '').trim() === 'true';
const pathExists = filePath => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};
const envPathExists = value => {
  const cleaned = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^file:\/\//i, '');
  if (!cleaned) {
    return false;
  }

  return [cleaned, path.resolve(process.cwd(), cleaned), path.resolve(webRoot, cleaned), path.resolve(repoRoot, cleaned)].some(
    pathExists
  );
};

const sandbox = forceLive
  ? false
  : forceSandbox ||
    isTrue(env.KKIAPAY_SANDBOX) ||
    isTrue(env.KKIA_SANDBOX) ||
    isTrue(env.NEXT_PUBLIC_KKIAPAY_SANDBOX);

const checks = [];

const addCheck = (label, ok, detail, level = 'required') => {
  checks.push({ label, ok, detail, level });
};

const publicFirebaseVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingPublicFirebaseVars = publicFirebaseVars.filter(name => !readFirst([name]));
addCheck(
  'Firebase client',
  missingPublicFirebaseVars.length === 0,
  missingPublicFirebaseVars.length
    ? `Variables manquantes: ${missingPublicFirebaseVars.join(', ')}`
    : 'Configuration client presente.'
);

const hasInlineAdminCredentials = Boolean(readFirst(['FIREBASE_ADMIN_CREDENTIALS']));
const hasAdminPair = Boolean(readFirst(['FIREBASE_ADMIN_CLIENT_EMAIL']) && readFirst(['FIREBASE_ADMIN_PRIVATE_KEY']));
const googleCredentialsPath = readFirst(['GOOGLE_APPLICATION_CREDENTIALS']);
const hasApplicationDefault = Boolean(googleCredentialsPath);
addCheck(
  'Firebase Admin',
  hasInlineAdminCredentials || hasAdminPair || hasApplicationDefault,
  hasInlineAdminCredentials
    ? 'FIREBASE_ADMIN_CREDENTIALS present.'
    : hasAdminPair
      ? 'FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY presents.'
      : hasApplicationDefault
        ? 'GOOGLE_APPLICATION_CREDENTIALS present.'
        : 'Ajoutez FIREBASE_ADMIN_CREDENTIALS ou FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY.'
);

if (googleCredentialsPath) {
  addCheck(
    'Firebase Admin fichier local',
    envPathExists(googleCredentialsPath),
    'GOOGLE_APPLICATION_CREDENTIALS doit pointer vers un fichier lisible.'
  );
}

const kkiapayPublicKey = sandbox
  ? readFirst(['KKIAPAY_SANDBOX_PUBLIC_KEY', 'KKIA_SANDBOX_PUBLIC_KEY', 'NEXT_PUBLIC_KKIAPAY_SANDBOX_KEY'])
  : readFirst([
      'KKIAPAY_LIVE_PUBLIC_KEY',
      'KKIA_LIVE_PUBLIC_KEY',
      'KKIAPAY_PUBLIC_KEY',
      'KKIA_PUBLIC_KEY',
      'NEXT_PUBLIC_KKIAPAY_LIVE_KEY',
      'NEXT_PUBLIC_KKIAPAY_KEY',
    ]);
const kkiapayPrivateKey = sandbox
  ? readFirst(['KKIAPAY_SANDBOX_PRIVATE_KEY', 'KKIA_SANDBOX_PRIVATE_KEY'])
  : readFirst(['KKIAPAY_LIVE_PRIVATE_KEY', 'KKIA_LIVE_PRIVATE_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIA_PRIVATE_KEY']);
const kkiapaySecretKey = sandbox
  ? readFirst(['KKIAPAY_SANDBOX_SECRET_KEY', 'KKIA_SANDBOX_SECRET_KEY'])
  : readFirst(['KKIAPAY_LIVE_SECRET_KEY', 'KKIA_LIVE_SECRET_KEY', 'KKIAPAY_SECRET_KEY', 'KKIA_SECRET_KEY']);

addCheck(
  `Kkiapay ${sandbox ? 'sandbox' : 'live'}`,
  Boolean(kkiapayPublicKey && kkiapayPrivateKey && kkiapaySecretKey),
  kkiapayPublicKey && kkiapayPrivateKey && kkiapaySecretKey
    ? 'Cles public/private/secret presentes.'
    : `Cles ${sandbox ? 'sandbox' : 'live'} incompletes.`
);

addCheck(
  'Webhook Kkiapay',
  Boolean(readFirst(['KKIAPAY_WEBHOOK_SECRET', 'KKIA_WEBHOOK_SECRET'])),
  'Secret webhook requis pour verifier les callbacks Kkiapay.'
);

const operationsKey = readFirst(['AFRICAPHONE_OPERATIONS_API_KEY']);
const cashierFallbackKey = readFirst(['CASHIER_API_KEY', 'AFRICAPHONE_CASHIER_API_KEY']);
addCheck(
  'API operations',
  Boolean(operationsKey || cashierFallbackKey),
  operationsKey
    ? 'Cle dediee AFRICAPHONE_OPERATIONS_API_KEY presente.'
    : cashierFallbackKey
      ? 'Cle caissier presente en fallback. Cle dediee conseillee avant production.'
      : 'Ajoutez AFRICAPHONE_OPERATIONS_API_KEY avant connexion application tierce.'
);

addCheck(
  'Recu telechargeable',
  true,
  'Ne depend pas du SMTP. Route: GET /api/payments/receipt avec compte client connecte.',
  'info'
);

addCheck(
  'SMTP',
  Boolean(readFirst(['SMTP_HOST']) && readFirst(['SMTP_USER']) && readFirst(['SMTP_PASS']) && readFirst(['SMTP_FROM'])),
  'Optionnel pour le premier deploiement si le recu telechargeable est accepte.',
  'optional'
);

console.log(`Mode Kkiapay controle: ${sandbox ? 'sandbox' : 'live'}`);
for (const check of checks) {
  const icon = check.ok ? 'OK' : check.level === 'optional' || check.level === 'info' ? 'INFO' : 'MISSING';
  console.log(`${icon} - ${check.label}: ${check.detail}`);
}

const requiredFailures = checks.filter(check => !check.ok && check.level === 'required');
if (requiredFailures.length > 0) {
  console.error(`\nConfiguration incomplete: ${requiredFailures.length} point(s) requis a corriger.`);
  process.exit(1);
}

console.log('\nConfiguration minimale valide pour ce mode.');
