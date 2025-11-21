/**
 * Backfill missing Kkiapay transactions into Firestore (payments + votes).
 *
 * Default behavior: DRY-RUN (no writes). Set DRY_RUN=false to apply.
 *
 * Env vars (optional):
 * - DRY_RUN: "false" to write changes, anything else keeps dry-run (default).
 * - SERVICE_ACCOUNT_PATH: path to service account JSON
 * - MISSING_PATH: path to missing transactions JSON
 *
 * Source of truth for missing tx: exports/kkiapay-missing-in-firestore-since-2025-11-17T00-14-35-WAT.json
 * Rule for votes: 1 vote per 100 XOF (minimum 1).
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const DRY_RUN = process.env.DRY_RUN !== 'false';
const SERVICE_ACCOUNT_PATH =
  process.env.SERVICE_ACCOUNT_PATH ||
  path.resolve(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json');
const MISSING_PATH =
  process.env.MISSING_PATH ||
  path.resolve(__dirname, '..', 'exports', 'kkiapay-missing-in-firestore-since-2025-11-17T00-14-35-WAT.json');

const VOTE_UNIT_XOF = 100;

function loadJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Missing file: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

function votesFromAmount(amount) {
  const n = Math.floor(Number(amount || 0) / VOTE_UNIT_XOF);
  return Math.max(1, n);
}

async function main() {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const missing = loadJson(MISSING_PATH);
  console.log(
    `Loaded ${missing.length} missing transactions from ${path.relative(process.cwd(), MISSING_PATH)}`
  );

  const stats = {
    processed: 0,
    skippedNoIntent: 0,
    alreadyCounted: 0,
    createdPayments: 0,
    createdVotes: 0,
    voteIncrements: 0,
  };

  for (const tx of missing) {
    stats.processed += 1;
    const txId = String(tx.transactionId || '').trim();
    const amount = Number(tx.amount || 0);
    const performedAt = toTimestamp(tx.performed_at);

    // Fetch intent to resolve contest/candidate
    const intentSnap = await db.collection('voteIntents').doc(tx.partnerId).get();
    if (!intentSnap.exists) {
      console.warn(`SKIP: no voteIntent for partnerId=${tx.partnerId}, tx=${txId}`);
      stats.skippedNoIntent += 1;
      continue;
    }
    const intent = intentSnap.data();
    const contestId = intent.contestId;
    const candidateId = intent.candidateId;
    if (!contestId || !candidateId) {
      console.warn(
        `SKIP: intent missing contest/candidate for partnerId=${tx.partnerId}, tx=${txId}`
      );
      stats.skippedNoIntent += 1;
      continue;
    }

    const contestRef = db.collection('contests').doc(contestId);
    const candidateRef = contestRef.collection('candidates').doc(candidateId);
    const paymentRef = db.collection('payments').doc(txId);
    const voteRef = contestRef.collection('votes').doc(txId);

    await db.runTransaction(async t => {
      const [paymentSnap, voteSnap] = await Promise.all([t.get(paymentRef), t.get(voteRef)]);

      const paymentExists = paymentSnap.exists;
      const voteExists = voteSnap.exists;

      const shouldIncrement = !voteExists;
      if (paymentExists && voteExists) {
        stats.alreadyCounted += 1;
        return;
      }

      if (!DRY_RUN) {
        if (!paymentExists) {
          t.set(
            paymentRef,
            {
              transactionId: txId,
              amount,
              partnerId: tx.partnerId || null,
              contestId,
              candidateId,
              status: 'success',
              source: 'recovery',
              performedAt: performedAt || null,
              verifiedAt: performedAt || FieldValue.serverTimestamp(),
              createdAt: performedAt || FieldValue.serverTimestamp(),
              recoveredFrom: 'kkiapay-csv-backfill',
            },
            { merge: true }
          );
          stats.createdPayments += 1;
        }

        if (!voteExists) {
          const votesToAdd = votesFromAmount(amount);
          t.set(
            voteRef,
            {
              transactionId: txId,
              amount,
              counted: true,
              contestId,
              candidateId,
              userId: intent.userId || 'guest',
              createdAt: performedAt || FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          t.set(candidateRef, { id: candidateId, contestId }, { merge: true });
          t.set(contestRef, { id: contestId }, { merge: true });
          t.update(candidateRef, { voteCount: FieldValue.increment(votesToAdd) });
          t.update(contestRef, { totalVotes: FieldValue.increment(votesToAdd) });
          stats.createdVotes += 1;
          stats.voteIncrements += votesToAdd;
        }
      }
    });

    if (DRY_RUN) {
      console.log(
        `DRY-RUN would backfill tx=${txId} amount=${amount} contest=${contestId} candidate=${candidateId}`
      );
    } else {
      console.log(
        `Applied backfill tx=${txId} amount=${amount} contest=${contestId} candidate=${candidateId}`
      );
    }
  }

  console.log('--- Summary ---');
  console.log(stats);
  if (DRY_RUN) {
    console.log('DRY-RUN mode: no writes performed. Set DRY_RUN=false to apply.');
  }
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exitCode = 1;
});
