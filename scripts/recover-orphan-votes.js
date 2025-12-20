
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DRY_RUN = process.env.DRY_RUN !== '0'; // Default to TRUE for safety
const VOTE_UNIT_XOF = 100;
const CSV_FILE = path.join(__dirname, '..', 'Affaire Vote', 'transactions-orphelines-v2.csv');

function initAdmin() {
    if (admin.apps.length > 0) return admin;
    // Try multiple credential paths
    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json',
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json'
    ];
    let credentials;
    for (const p of possiblePaths) {
        try {
            credentials = require(path.join(process.cwd(), p));
            break;
        } catch (e) { }
    }
    if (!credentials) throw new Error("Service account not found");

    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return admin;
}

function parseCsv(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        // Handle CSV parsing simply (assuming no commas in values based on known structure)
        // If complex CSV, use a library. Here we do simple split.
        // Format: TransactionId,PartnerId,Montant,Date,Client,Telephone
        // Note: Date/Client/Tel might be quoted.
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // Fallback split if match fails
        const parts = matches.length ? matches.map(m => m.replace(/^"|"$/g, '')) : line.split(',');

        return {
            transactionId: parts[0],
            partnerId: parts[1],
            amount: Number(parts[2]),
            date: parts[3],
            client: parts[4],
            phone: parts[5]
        };
    });
}

async function backfillTransaction(db, entry) {
    const intentRef = db.collection('voteIntents').doc(entry.partnerId);
    const intentSnap = await intentRef.get();

    if (!intentSnap.exists) {
        console.log(`[MISSING_INTENT] PartnerId=${entry.partnerId} not found in DB`);
        return { status: 'missing_intent' };
    }

    const intentData = intentSnap.data();
    const contestId = intentData.contestId;
    const candidateId = intentData.candidateId;

    if (!contestId || !candidateId) {
        console.log(`[INVALID_INTENT] Missing contest/candidate for PartnerId=${entry.partnerId}`);
        return { status: 'invalid_intent' };
    }

    const effectiveAmount = entry.amount || intentData.amount || VOTE_UNIT_XOF;
    const votesToAdd = Math.floor(effectiveAmount / VOTE_UNIT_XOF);

    if (DRY_RUN) {
        console.log(`[DRY_RUN] Would recover: Tx=${entry.transactionId} -> Candidate=${candidateId} (${votesToAdd} votes)`);
        return { status: 'dry_run', votes: votesToAdd };
    }

    // REAL WRITE
    try {
        await db.runTransaction(async tx => {
            const contestRef = db.collection('contests').doc(contestId);
            const candidateRef = contestRef.collection('candidates').doc(candidateId);
            const voteRef = contestRef.collection('votes').doc(entry.transactionId);
            const paymentRef = db.collection('payments').doc(entry.transactionId);

            // Check if vote already counted
            const voteSnap = await tx.get(voteRef);
            if (voteSnap.exists && voteSnap.data().counted) {
                console.log(`[SKIPPED] Vote already exists for ${entry.transactionId}`);
                return;
            }

            // Create Payment
            tx.set(paymentRef, {
                transactionId: entry.transactionId,
                partnerId: entry.partnerId,
                amount: effectiveAmount,
                status: 'success',
                source: 'recovery_orphans',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Create Vote
            tx.set(voteRef, {
                transactionId: entry.transactionId,
                candidateId,
                contestId,
                amount: effectiveAmount,
                counted: true,
                recovered: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Increment
            tx.update(candidateRef, { voteCount: admin.firestore.FieldValue.increment(votesToAdd) });
            tx.update(contestRef, { totalVotes: admin.firestore.FieldValue.increment(votesToAdd) });

            // Update Intent
            tx.update(intentRef, {
                status: 'counted',
                transactionId: entry.transactionId,
                recoveredAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        console.log(`[RECOVERED] ${entry.transactionId} -> ${candidateId}`);
        return { status: 'recovered', votes: votesToAdd };
    } catch (e) {
        console.error(`[ERROR] ${entry.transactionId}: ${e.message}`);
        return { status: 'error' };
    }
}

async function main() {
    console.log(`=== RECOVERY SCRIPT (DRY_RUN=${DRY_RUN}) ===`);
    initAdmin();
    const db = admin.firestore();

    const entries = parseCsv(CSV_FILE);
    console.log(`Loaded ${entries.length} orphan transactions.`);

    let stats = { recovered: 0, missing: 0, votes: 0, missingAmount: 0 };

    for (const entry of entries) {
        if (!entry.partnerId) continue;
        const res = await backfillTransaction(db, entry);
        if (res.status === 'dry_run' || res.status === 'recovered') {
            stats.recovered++;
            stats.votes += res.votes;
        } else {
            stats.missing++;
            stats.missingAmount += (entry.amount || 0);
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Found in DB (Recoverable): ${stats.recovered}`);
    console.log(`Missing in DB (Unrecoverable): ${stats.missing}`);
    console.log(`Total Votes to add: ${stats.votes}`);
    console.log(`Total Amount Unrecoverable: ${stats.missingAmount} XOF`);
}

main();
