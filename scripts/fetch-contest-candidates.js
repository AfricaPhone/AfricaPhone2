/* eslint-disable no-console */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json');

const readServiceAccount = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
  }
  const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
  return JSON.parse(raw);
};

const ensureFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }
  const serviceAccount = readServiceAccount();
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

const getContestIdFromArgs = () => {
  const contestId = process.argv[2];
  if (!contestId) {
    console.error('Usage: node scripts/fetch-contest-candidates.js <contestId>');
    process.exit(1);
  }
  return contestId.trim();
};

const getSafeString = value => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);

const main = async () => {
  ensureFirebase();
  const db = admin.firestore();
  const contestId = getContestIdFromArgs();

  const candidatesRef = db.collection('contests').doc(contestId).collection('candidates');
  const profilesRef = db.collection('contestCandidateProfiles').where('contestId', '==', contestId);

  const [candidatesSnapshot, profilesSnapshot] = await Promise.all([candidatesRef.get(), profilesRef.get()]);

  if (candidatesSnapshot.empty) {
    console.log(`No candidates found for contest ${contestId}.`);
    return;
  }

  const profileMap = new Map();
  profilesSnapshot.forEach(docSnap => {
    const data = docSnap.data() || {};
    profileMap.set(docSnap.id, {
      phone: getSafeString(data.phone) || null,
      phoneNormalized: getSafeString(data.phoneNormalized) || null,
    });
  });

  const rows = candidatesSnapshot.docs.map(docSnap => {
    const data = docSnap.data() || {};
    const profile = profileMap.get(docSnap.id) || {};
    return {
      id: docSnap.id,
      name: getSafeString(data.name) || 'Candidat',
      media: getSafeString(data.media),
      phone: profile.phone || profile.phoneNormalized || null,
      phoneNormalized: profile.phoneNormalized || profile.phone || null,
      contestId,
    };
  });

  console.log(`Found ${rows.length} candidates for contest ${contestId}.`);
  rows.forEach((row, index) => {
    const displayPhone = row.phoneNormalized || row.phone || 'N/A';
    console.log(`${index + 1}. ${row.name} - ${displayPhone}`);
  });
  console.log('--- JSON OUTPUT ---');
  console.log(JSON.stringify(rows, null, 2));
};

main().catch(error => {
  console.error('Failed to fetch contest candidates:', error);
  process.exit(1);
});
