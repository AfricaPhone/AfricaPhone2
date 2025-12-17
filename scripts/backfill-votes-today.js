#!/usr/bin/env node

/**
 * Backfill script to recover lost votes for votes-artistes contest.
 * Updated version for 17 December 2025
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const DRY_RUN = process.env.DRY_RUN === '1';
const VOTE_UNIT_XOF = 100;
const CONTEST_ID = 'votes-artistes';

// Use today's date
const timestamp = new Date().toISOString().split('T')[0];
const LOST_VOTES_FILE = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.json`);

function initAdmin() {
    if (admin.apps.length > 0) return admin;

    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json',
        'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json',
    ];

    let credentials = null;
    for (const fileName of possiblePaths) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            credentials = require(filePath);
            console.log(`Using service account: ${fileName}`);
            break;
        } catch (e) { }
    }

    if (!credentials) {
        throw new Error('No service account file found!');
    }

    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return admin;
}

async function backfillVote(db, vote) {
    const { transactionId, partnerId, amount, candidateId } = vote;

    if (!transactionId || !partnerId || !candidateId) {
        console.warn(`[SKIP] Missing data for vote: ${JSON.stringify(vote)}`);
        return { status: 'invalid_data' };
    }

    const effectiveAmount = Number(amount) || VOTE_UNIT_XOF;
    const votesToAdd = Math.max(1, Math.floor(effectiveAmount / VOTE_UNIT_XOF));

    const intentRef = db.collection('voteIntents').doc(partnerId);
    const contestRef = db.collection('contests').doc(CONTEST_ID);
    const candidateRef = contestRef.collection('candidates').doc(candidateId);
    const voteRef = contestRef.collection('votes').doc(transactionId);
    const paymentRef = db.collection('payments').doc(transactionId);

    if (DRY_RUN) {
        console.log(`[DRY RUN] Would backfill:`);
        console.log(`  Transaction: ${transactionId}`);
        console.log(`  Intent: ${partnerId}`);
        console.log(`  Candidate: ${candidateId}`);
        console.log(`  Amount: ${effectiveAmount} XOF = ${votesToAdd} votes`);
        return { status: 'dry_run', votes: votesToAdd };
    }

    try {
        await db.runTransaction(async tx => {
            // Check if vote already exists
            const voteSnap = await tx.get(voteRef);
            if (voteSnap.exists && voteSnap.data()?.counted === true) {
                console.log(`[SKIP] Vote already exists for tx=${transactionId}`);
                return;
            }

            // Check if intent is already counted
            const intentSnap = await tx.get(intentRef);
            if (intentSnap.exists && intentSnap.data()?.status === 'counted') {
                console.log(`[SKIP] Intent already counted for partnerId=${partnerId}`);
                return;
            }

            // Create/update payment document
            tx.set(paymentRef, {
                transactionId,
                partnerId,
                amount: effectiveAmount,
                status: 'success',
                source: 'backfill',
                contestId: CONTEST_ID,
                candidateId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // Ensure contest and candidate docs exist
            tx.set(contestRef, { id: CONTEST_ID }, { merge: true });
            tx.set(candidateRef, { id: candidateId, contestId: CONTEST_ID }, { merge: true });

            // Create vote document
            tx.set(voteRef, {
                transactionId,
                userId: intentSnap.exists ? (intentSnap.data()?.userId || 'guest') : 'guest',
                candidateId,
                contestId: CONTEST_ID,
                amount: effectiveAmount,
                counted: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // Increment counters
            tx.update(candidateRef, {
                voteCount: admin.firestore.FieldValue.increment(votesToAdd),
            });
            tx.update(contestRef, {
                totalVotes: admin.firestore.FieldValue.increment(votesToAdd),
            });

            // Mark intent as counted
            if (intentSnap.exists) {
                tx.set(intentRef, {
                    status: 'counted',
                    transactionId,
                    countedAt: admin.firestore.FieldValue.serverTimestamp(),
                    backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }

            console.log(`[OK] Backfilled tx=${transactionId}, candidate=${candidateId}, votes=${votesToAdd}`);
        });

        return { status: 'backfilled', votes: votesToAdd };
    } catch (error) {
        console.error(`[ERROR] Failed to backfill tx=${transactionId}:`, error.message);
        return { status: 'error', error: error.message };
    }
}

async function main() {
    console.log('\n========================================');
    console.log('   BACKFILL DES VOTES PERDUS');
    console.log('   Concours: votes-artistes');
    console.log(`   Date: ${timestamp}`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (simulation)' : 'PRODUCTION'}`);
    console.log('========================================\n');

    // Read lost votes
    if (!fs.existsSync(LOST_VOTES_FILE)) {
        console.error(`Fichier non trouvé: ${LOST_VOTES_FILE}`);
        process.exit(1);
    }

    const lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));
    console.log(`Votes à récupérer: ${lostVotes.length}\n`);

    if (lostVotes.length === 0) {
        console.log('Aucun vote à récupérer.');
        process.exit(0);
    }

    initAdmin();
    const db = admin.firestore();

    let totalBackfilled = 0;
    let totalVotes = 0;
    let totalAmount = 0;
    let skipped = 0;
    let errors = 0;

    for (const vote of lostVotes) {
        const result = await backfillVote(db, vote);

        if (result.status === 'backfilled' || result.status === 'dry_run') {
            totalBackfilled++;
            totalVotes += result.votes || 0;
            totalAmount += Number(vote.amount) || 0;
        } else if (result.status === 'error') {
            errors++;
        } else {
            skipped++;
        }
    }

    console.log('\n========================================');
    console.log('           RÉSUMÉ');
    console.log('========================================');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log(`Transactions traitées: ${lostVotes.length}`);
    console.log(`Backfillées: ${totalBackfilled}`);
    console.log(`Skippées: ${skipped}`);
    console.log(`Erreurs: ${errors}`);
    console.log(`Total votes récupérés: ${totalVotes}`);
    console.log(`Total montant: ${totalAmount} XOF`);
    console.log('========================================\n');

    if (DRY_RUN) {
        console.log('⚠️  Mode DRY RUN - Aucune modification effectuée.');
        console.log('Pour exécuter réellement, lancez sans DRY_RUN=1');
    } else {
        console.log('✅ Backfill terminé !');
    }

    process.exit(0);
}

main().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
});
