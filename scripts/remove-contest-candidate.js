/* eslint-disable no-console */
/**
 * Remove a contest candidate and related votes, then adjust contest totals.
 *
 * Usage:
 *   node scripts/remove-contest-candidate.js <contestId> <candidateId>
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json');

const getServiceAccount = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
  }
  return JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
};

const ensureFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }
  return admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
};

const parseArgs = () => {
  const contestId = process.argv[2];
  const candidateId = process.argv[3];
  if (!contestId || !candidateId) {
    console.error('Usage: node scripts/remove-contest-candidate.js <contestId> <candidateId>');
    process.exit(1);
  }
  return { contestId: contestId.trim(), candidateId: candidateId.trim() };
};

const votesFromAmount = amountRaw => {
  const amount = Number(amountRaw);
  const normalized = Number.isFinite(amount) && amount > 0 ? amount : 100;
  return Math.max(1, Math.floor(normalized / 100));
};

const main = async () => {
  const { contestId, candidateId } = parseArgs();
  ensureFirebase();
  const db = admin.firestore();

  const contestRef = db.collection('contests').doc(contestId);
  const candidateRef = contestRef.collection('candidates').doc(candidateId);
  const profileRef = db.collection('contestCandidateProfiles').doc(candidateId);

  const [contestSnap, candidateSnap, votesSnap] = await Promise.all([
    contestRef.get(),
    candidateRef.get(),
    contestRef.collection('votes').where('candidateId', '==', candidateId).get(),
  ]);

  if (!candidateSnap.exists) {
    console.error(`Candidate ${candidateId} not found in contest ${contestId}.`);
    process.exit(1);
  }

  const contestData = contestSnap.data() || {};
  const candidateData = candidateSnap.data() || {};

  const votesFromDocs = votesSnap.docs.reduce((sum, docSnap) => {
    const data = docSnap.data() || {};
    if (data.counted === false) return sum;
    return sum + votesFromAmount(data.amount);
  }, 0);

  const candidateVoteCount = typeof candidateData.voteCount === 'number' ? candidateData.voteCount : 0;
  const votesToSubtract = votesFromDocs || candidateVoteCount || 0;

  console.log(`Removing candidate ${candidateId} (${candidateData.name || 'Sans nom'}) from contest ${contestId}`);
  console.log(`Votes to subtract from contest total: ${votesToSubtract}`);
  console.log(`Votes documents to delete: ${votesSnap.size}`);

  await db.runTransaction(async tx => {
    const freshContest = await tx.get(contestRef);
    const currentTotal = typeof freshContest.get('totalVotes') === 'number' ? freshContest.get('totalVotes') : 0;
    const nextTotal = Math.max(0, currentTotal - votesToSubtract);

    tx.update(contestRef, { totalVotes: nextTotal });
    tx.delete(candidateRef);
    tx.delete(profileRef);
  });

  // Delete votes in batches of 400 to stay under limits.
  const voteDocs = votesSnap.docs;
  const chunkSize = 400;
  for (let i = 0; i < voteDocs.length; i += chunkSize) {
    const batch = db.batch();
    voteDocs.slice(i, i + chunkSize).forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
  }

  console.log('Removal completed.');
  console.log(
    JSON.stringify(
      {
        contestId,
        candidateId,
        candidateName: candidateData.name || null,
        votesRemoved: votesToSubtract,
        voteDocsDeleted: votesSnap.size,
      },
      null,
      2
    )
  );
};

main().catch(error => {
  console.error('Failed to remove candidate:', error);
  process.exit(1);
});
