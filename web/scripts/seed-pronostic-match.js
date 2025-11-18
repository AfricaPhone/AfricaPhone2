#!/usr/bin/env node
/**
 * Seeds a pronostic match document in Firestore.
 *
 * Usage example:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json \
 *   node web/scripts/seed-pronostic-match.js \
 *     --id=afcon-qualifier-2025-11-05 \
 *     --teamA=Benin \
 *     --teamB=Ghana \
 *     --competition="AFCON Qualifier" \
 *     --start=2025-11-05T18:00:00Z
 *
 * Any missing parameter falls back to a sensible default.
 */

const fs = require('fs');
const admin = require('firebase-admin');

const REQUIRED_FIELDS = ['id', 'teamA', 'teamB'];

function parseArgs() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith('--')) {
      continue;
    }
    const withoutPrefix = raw.slice(2);
    const [key, ...rest] = withoutPrefix.split('=');
    const value = rest.length > 0 ? rest.join('=') : 'true';
    args[key] = value;
  }
  return args;
}

function ensureCredentials() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set.');
  }
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Service account file not found at ${credentialsPath}`);
  }
}

function resolveStartDate(value) {
  if (!value) {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --start value "${value}". Expected ISO-8601 date string.`);
  }
  return date;
}

async function main() {
  ensureCredentials();
  const args = parseArgs();

  for (const field of REQUIRED_FIELDS) {
    if (!args[field]) {
      throw new Error(`Missing required argument --${field}`);
    }
  }

  const matchId = String(args.id);
  const teamA = String(args.teamA);
  const teamB = String(args.teamB);
  const competition = args.competition ? String(args.competition) : 'Friendly Match';
  const teamALogo = args.teamALogo ? String(args.teamALogo) : null;
  const teamBLogo = args.teamBLogo ? String(args.teamBLogo) : null;
  const venue = args.venue ? String(args.venue) : null;
  const startDate = resolveStartDate(args.start);

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const db = admin.firestore();
  const matchRef = db.collection('matches').doc(matchId);

  const payload = {
    teamA,
    teamB,
    competition,
    teamALogo: teamALogo ?? null,
    teamBLogo: teamBLogo ?? null,
    venue: venue ?? null,
    startTime: admin.firestore.Timestamp.fromDate(startDate),
    predictionCount: 0,
    trends: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await matchRef.set(payload, { merge: true });
  console.log(`Match ${matchId} seeded successfully:`);
  console.log(JSON.stringify({ matchId, teamA, teamB, competition, startTime: startDate.toISOString() }, null, 2));
  process.exit(0);
}

main().catch(error => {
  console.error('Failed to seed pronostic match.');
  console.error(error);
  process.exit(1);
});
