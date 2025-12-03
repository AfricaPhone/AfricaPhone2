#!/usr/bin/env node

/**
 * Backfills KKiaPay transactions that were captured by the provider
 * but never counted as votes in Firestore.
 *
 * Source data: Vote_non_trouve.csv at the repo root (KKiaPay export).
 *
 * For each row, this script:
 *   - Reads transactionId, amount, partnerId, voter name, phone.
 *   - Looks up voteIntents/{partnerId} to find contestId + candidateId.
 *   - Runs a Firestore transaction that:
 *       - Upserts payments/{transactionId} (status: success, source: backfill).
 *       - Creates contests/{contestId}/votes/{transactionId} if missing.
 *       - Increments candidate.voteCount and contest.totalVotes
 *         based on amount / 100 XOF (at least 1 vote).
 *       - Marks the vote intent as status: 'counted'.
 *
 * Safety:
 *   - If the vote record already exists or the intent is already counted,
 *     the transaction is skipped (idempotent).
 *   - Use DRY_RUN=1 to log actions without writing to Firestore.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DRY_RUN = process.env.DRY_RUN === '1';
const VOTE_UNIT_XOF = 100;

function initAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccountPath = path.join(
    process.cwd(),
    'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
  );

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const credentials = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });

  return admin;
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim());
  if (lines.length <= 1) {
    throw new Error('CSV appears empty or missing data rows.');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const parts = line.split(',');
    if (!parts[0]) {
      // skip malformed
      // eslint-disable-next-line no-continue
      continue;
    }
    const transactionId = String(parts[0] || '').trim();
    const date = String(parts[1] || '').trim();
    const amount = Number(parts[2] || 0) || 0;
    const phone = String(parts[6] || '').trim();
    const voterName = String(parts[7] || '').trim();
    const partnerId = String(parts[9] || '').trim();

    if (!transactionId || !partnerId || !amount) {
      // eslint-disable-next-line no-continue
      continue;
    }

    rows.push({
      transactionId,
      date,
      amount,
      phone,
      voterName,
      partnerId,
    });
  }

  return rows;
}

async function loadVoteIntent(db, partnerId) {
  const ref = db.collection('voteIntents').doc(partnerId);
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }
  return { ref, data: snap.data() };
}

async function backfillTransaction(db, entry) {
  const intent = await loadVoteIntent(db, entry.partnerId);

  if (!intent) {
    console.warn(
      `[SKIP] No voteIntent found for partnerId=${entry.partnerId} (tx=${entry.transactionId})`
    );
    return { status: 'missing_intent' };
  }

  const { ref: intentRef, data: intentData } = intent;
  const contestId = String(intentData.contestId || '').trim();
  const candidateId = String(intentData.candidateId || '').trim();
  const userId = String(intentData.userId || 'guest');

  if (!contestId || !candidateId) {
    console.warn(
      `[SKIP] Intent missing contestId or candidateId for partnerId=${entry.partnerId} (tx=${entry.transactionId})`
    );
    return { status: 'invalid_intent' };
  }

  const contestRef = db.collection('contests').doc(contestId);
  const candidateRef = contestRef.collection('candidates').doc(candidateId);
  const voteRef = contestRef.collection('votes').doc(entry.transactionId);
  const paymentRef = db.collection('payments').doc(entry.transactionId);

  const effectiveAmount = Number(intentData.amount || entry.amount || VOTE_UNIT_XOF);
  const votesToAdd = Math.max(1, Math.floor(effectiveAmount / VOTE_UNIT_XOF));

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would backfill tx=${entry.transactionId} partnerId=${entry.partnerId} ` +
        `contestId=${contestId} candidateId=${candidateId} amount=${effectiveAmount} votes=${votesToAdd}`
    );
    return { status: 'dry_run' };
  }

  await db.runTransaction(async tx => {
    const [intentSnap, voteSnap, paymentSnap] = await Promise.all([
      tx.get(intentRef),
      tx.get(voteRef),
      tx.get(paymentRef),
    ]);

    if (!intentSnap.exists) {
      console.warn(
        `[SKIP] Intent vanished for partnerId=${entry.partnerId} during transaction (tx=${entry.transactionId})`
      );
      return;
    }

    const currentIntent = intentSnap.data() || {};
    if (currentIntent.status === 'counted') {
      console.log(
        `[SKIP] Intent already counted for partnerId=${entry.partnerId} (tx=${entry.transactionId})`
      );
      return;
    }

    if (voteSnap.exists && voteSnap.data()?.counted === true) {
      console.log(
        `[SKIP] Vote document already exists & counted for tx=${entry.transactionId}`
      );
      return;
    }

    const existingPayment = paymentSnap.exists ? paymentSnap.data() || {} : {};

    // Upsert payment
    tx.set(
      paymentRef,
      {
        ...existingPayment,
        transactionId: entry.transactionId,
        partnerId: entry.partnerId,
        amount: effectiveAmount,
        status: 'success',
        source: existingPayment.source || 'backfill',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Ensure contest & candidate docs exist
    tx.set(contestRef, { id: contestId }, { merge: true });
    tx.set(candidateRef, { id: candidateId, contestId }, { merge: true });

    // Create vote audit doc
    tx.set(
      voteRef,
      {
        transactionId: entry.transactionId,
        userId,
        candidateId,
        contestId,
        amount: effectiveAmount,
        counted: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Increment counters
    tx.update(candidateRef, {
      voteCount: admin.firestore.FieldValue.increment(votesToAdd),
    });
    tx.update(contestRef, {
      totalVotes: admin.firestore.FieldValue.increment(votesToAdd),
    });

    // Mark intent as counted
    tx.set(
      intentRef,
      {
        status: 'counted',
        transactionId: entry.transactionId,
        countedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[OK] Backfilled tx=${entry.transactionId} partnerId=${entry.partnerId} ` +
        `contestId=${contestId} candidateId=${candidateId} amount=${effectiveAmount} votes=${votesToAdd}`
    );
  });

  return { status: 'backfilled', votes: votesToAdd };
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const csvPath = path.join(process.cwd(), 'Vote_non_trouve.csv');
  const entries = parseCsv(csvPath);
  if (!entries.length) {
    console.log('No valid entries to process from CSV.');
    return;
  }

  console.log(
    `Processing ${entries.length} KKiaPay transactions from ${path.basename(csvPath)} ` +
      `(DRY_RUN=${DRY_RUN ? '1' : '0'})`
  );

  let processed = 0;
  let skipped = 0;
  let totalVotes = 0;
  let totalAmount = 0;

  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    const result = await backfillTransaction(db, entry);
    processed += 1;
    totalAmount += entry.amount;
    if (result.status === 'backfilled' || result.status === 'dry_run') {
      totalVotes += result.votes || 0;
    } else {
      skipped += 1;
    }
  }

  console.log(
    `Done. Processed=${processed}, Skipped=${skipped}, ` +
      `TotalAmount=${totalAmount} XOF, EstimatedVotes=${totalVotes}`
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error('backfill-missing-kkiapay-votes failed:', error);
    process.exit(1);
  });
}

