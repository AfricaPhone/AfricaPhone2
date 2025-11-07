#!/usr/bin/env node

/**
 * Simple CLI to manage contestSubmissions/settings.
 * Usage examples:
 *   node scripts/contest-settings.js show
 *   node scripts/contest-settings.js upsert --contestId=press-stars-2025 --sitePublicUrl=https://votes.example.com --isOpen=true
 */

const path = require('path');

const DEFAULT_CONTEST_ID = 'press-stars-2025';
const DEFAULT_URL = 'https://africaphone.org/votes';

const toBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const lowered = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lowered)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(lowered)) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
};

const readInlineCredential = () => {
  const inlineCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!inlineCredentials) {
    return null;
  }

  const payload =
    inlineCredentials.trim().startsWith('{') ?
      inlineCredentials :
      Buffer.from(inlineCredentials, 'base64').toString('utf8');

  return JSON.parse(payload);
};

const resolveCredential = (admin) => {
  const inline = readInlineCredential();
  if (inline) {
    return admin.credential.cert({
      projectId: inline.project_id,
      clientEmail: inline.client_email,
      privateKey: inline.private_key.replace(/\\n/g, '\n'),
    });
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey) {
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }

  throw new Error(
    'No admin credentials found. Set FIREBASE_ADMIN_CREDENTIALS (base64 JSON), FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.'
  );
};

const parseArgs = (argv) => {
  const args = { _: [] };
  argv.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, rawValue] = arg.slice(2).split('=');
      args[key] = rawValue ?? true;
    } else {
      args._.push(arg);
    }
  });
  return args;
};

const formatSettings = (settings) => ({
  contestId: settings.contestId || DEFAULT_CONTEST_ID,
  sitePublicUrl: settings.sitePublicUrl || DEFAULT_URL,
  isOpen: Boolean(settings.isOpen),
  updatedAt: settings.updatedAt?.toDate ? settings.updatedAt.toDate().toISOString() : settings.updatedAt || null,
  updatedBy: settings.updatedBy || null,
});

async function bootstrapAdmin() {
  const adminModule = await import('firebase-admin');
  const admin = adminModule.default ?? adminModule;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: resolveCredential(admin),
    });
  }

  return admin;
}

async function showSettings(db) {
  const snapshot = await db.collection('contestSubmissions').doc('settings').get();
  if (!snapshot.exists) {
    console.log('No settings document found. Run "upsert" to create one.');
    return;
  }
  console.table(formatSettings(snapshot.data()));
}

async function upsertSettings(db, options) {
  const settingsRef = db.collection('contestSubmissions').doc('settings');
  const existing = await settingsRef.get();
  const payload = existing.exists ? existing.data() : {};

  if (options.contestId) {
    payload.contestId = options.contestId.trim();
  }
  if (options.sitePublicUrl) {
    payload.sitePublicUrl = options.sitePublicUrl.trim();
  }
  if (options.isOpen !== undefined) {
    payload.isOpen = options.isOpen;
  }

  payload.updatedAt = new Date();
  payload.updatedBy = options.actor || process.env.USER || 'cli';

  await settingsRef.set(payload, { merge: true });
  console.log('Settings updated successfully:');
  console.table(formatSettings(payload));
}

async function main() {
  const [, , ...argv] = process.argv;
  const args = parseArgs(argv);
  const action = args._[0] || 'show';

  const admin = await bootstrapAdmin();
  const db = admin.firestore();

  if (action === 'show') {
    await showSettings(db);
    return;
  }

  if (action === 'upsert') {
    const options = {
      contestId: args.contestId,
      sitePublicUrl: args.sitePublicUrl,
      isOpen: args.isOpen !== undefined ? toBoolean(args.isOpen) : undefined,
      actor: args.actor,
    };
    await upsertSettings(db, options);
    return;
  }

  throw new Error(`Unsupported action "${action}". Use "show" or "upsert".`);
}

main().catch((error) => {
  console.error('contest-settings failed:', error);
  process.exit(1);
});
