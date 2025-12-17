#!/usr/bin/env node

/**
 * Export all Firebase data related to the "votes-artistes" contest.
 * Exports:
 * - Contest data
 * - Candidates data
 * - Votes data
 * - VoteIntents for this contest
 * - Payments for this contest
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const CONTEST_ID = 'votes-artistes';

function initAdmin() {
    if (admin.apps.length > 0) {
        return admin;
    }

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
        } catch (e) {
            // Try next
        }
    }

    if (!credentials) {
        throw new Error('No service account file found!');
    }

    admin.initializeApp({
        credential: admin.credential.cert(credentials),
    });

    return admin;
}

function serializeTimestamp(value) {
    if (!value) return null;
    if (value.toDate) {
        return value.toDate().toISOString();
    }
    if (value._seconds) {
        return new Date(value._seconds * 1000).toISOString();
    }
    return value;
}

function serializeDoc(doc) {
    const data = doc.data();
    const result = { id: doc.id };

    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && (value.toDate || value._seconds)) {
            result[key] = serializeTimestamp(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

async function main() {
    initAdmin();
    const db = admin.firestore();

    const timestamp = new Date().toISOString().split('T')[0];
    const exportDir = path.join(process.cwd(), 'exports');
    fs.mkdirSync(exportDir, { recursive: true });

    console.log(`\n=== EXPORT DU CONCOURS "${CONTEST_ID}" ===\n`);
    console.log(`Date: ${new Date().toISOString()}\n`);

    // 1. Export contest data
    console.log('1. Export des données du concours...');
    const contestDoc = await db.collection('contests').doc(CONTEST_ID).get();

    if (!contestDoc.exists) {
        console.error(`Concours "${CONTEST_ID}" non trouvé!`);
        process.exit(1);
    }

    const contestData = serializeDoc(contestDoc);
    console.log(`   - Titre: ${contestData.title || 'N/A'}`);
    console.log(`   - Total votes: ${contestData.totalVotes || 0}`);
    console.log(`   - Status: ${contestData.status || 'N/A'}`);

    // 2. Export candidates
    console.log('\n2. Export des candidats...');
    const candidatesSnap = await db.collection('contests').doc(CONTEST_ID)
        .collection('candidates').get();

    const candidates = [];
    candidatesSnap.forEach(doc => {
        candidates.push(serializeDoc(doc));
    });

    // Sort by voteCount descending
    candidates.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    console.log(`   - ${candidates.length} candidats trouvés`);

    // Show top 5
    console.log('   Top 5:');
    candidates.slice(0, 5).forEach((c, i) => {
        console.log(`     ${i + 1}. ${c.name || c.id}: ${c.voteCount || 0} voix`);
    });

    // 3. Export votes
    console.log('\n3. Export des votes comptabilisés...');
    const votesSnap = await db.collection('contests').doc(CONTEST_ID)
        .collection('votes').get();

    const votes = [];
    votesSnap.forEach(doc => {
        votes.push(serializeDoc(doc));
    });
    console.log(`   - ${votes.length} votes enregistrés`);

    // 4. Export voteIntents for this contest
    console.log('\n4. Export des voteIntents...');
    const intentsSnap = await db.collection('voteIntents')
        .where('contestId', '==', CONTEST_ID)
        .get();

    const intents = { pending: [], counted: [], other: [] };
    intentsSnap.forEach(doc => {
        const data = serializeDoc(doc);
        if (data.status === 'pending') {
            intents.pending.push(data);
        } else if (data.status === 'counted') {
            intents.counted.push(data);
        } else {
            intents.other.push(data);
        }
    });

    console.log(`   - Pending: ${intents.pending.length}`);
    console.log(`   - Counted: ${intents.counted.length}`);
    console.log(`   - Other: ${intents.other.length}`);

    // 5. Export payments for this contest
    console.log('\n5. Export des paiements...');
    const paymentsSnap = await db.collection('payments')
        .where('contestId', '==', CONTEST_ID)
        .get();

    const payments = { success: [], pending: [], failed: [], other: [] };
    paymentsSnap.forEach(doc => {
        const data = serializeDoc(doc);
        if (data.status === 'success') {
            payments.success.push(data);
        } else if (data.status === 'pending') {
            payments.pending.push(data);
        } else if (data.status === 'failed') {
            payments.failed.push(data);
        } else {
            payments.other.push(data);
        }
    });

    console.log(`   - Success: ${payments.success.length}`);
    console.log(`   - Pending: ${payments.pending.length}`);
    console.log(`   - Failed: ${payments.failed.length}`);
    console.log(`   - Other: ${payments.other.length}`);

    // 6. Create export files
    console.log('\n6. Création des fichiers d\'export...');

    const exportData = {
        exportDate: new Date().toISOString(),
        contestId: CONTEST_ID,
        contest: contestData,
        candidates,
        votes,
        voteIntents: intents,
        payments,
        summary: {
            totalCandidates: candidates.length,
            totalVotesRecorded: votes.length,
            totalVotesFromContest: contestData.totalVotes || 0,
            intentsPending: intents.pending.length,
            intentsCounted: intents.counted.length,
            paymentsSuccess: payments.success.length,
            paymentsPending: payments.pending.length,
        }
    };

    // Full export
    const fullExportPath = path.join(exportDir, `${CONTEST_ID}-full-export-${timestamp}.json`);
    fs.writeFileSync(fullExportPath, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Export complet: ${fullExportPath}`);

    // Pending intents export (for comparison with Kkiapay)
    const pendingExportPath = path.join(exportDir, `${CONTEST_ID}-pending-intents-${timestamp}.json`);
    fs.writeFileSync(pendingExportPath, JSON.stringify(intents.pending, null, 2));
    console.log(`   ✅ Intents pending: ${pendingExportPath}`);

    // CSV for pending intents
    const csvLines = ['intentId,contestId,candidateId,amount,status,createdAt'];
    intents.pending.forEach(intent => {
        csvLines.push(`${intent.id},${intent.contestId},${intent.candidateId},${intent.amount},${intent.status},${intent.createdAt || ''}`);
    });
    const csvPath = path.join(exportDir, `${CONTEST_ID}-pending-intents-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`   ✅ CSV pending: ${csvPath}`);

    // Summary
    console.log('\n========================================');
    console.log('           RÉSUMÉ DE L\'EXPORT          ');
    console.log('========================================');
    console.log(`Concours: ${contestData.title}`);
    console.log(`Total votes (contest): ${contestData.totalVotes || 0}`);
    console.log(`Votes enregistrés: ${votes.length}`);
    console.log(`Candidats: ${candidates.length}`);
    console.log(`VoteIntents pending: ${intents.pending.length}`);
    console.log(`VoteIntents counted: ${intents.counted.length}`);
    console.log(`Paiements success: ${payments.success.length}`);
    console.log(`Paiements pending: ${payments.pending.length}`);
    console.log('========================================\n');

    console.log('=== FIN DE L\'EXPORT ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
