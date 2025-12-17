#!/usr/bin/env node

/**
 * Diagnostic script to analyze current vote contest data.
 * Shows pending voteIntents, pending payments, and current contest status.
 */

const path = require('path');
const admin = require('firebase-admin');

function initAdmin() {
    if (admin.apps.length > 0) {
        return admin;
    }

    // Try different service account file names
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

async function main() {
    initAdmin();
    const db = admin.firestore();

    console.log('\n=== DIAGNOSTIC DU SYSTÈME DE VOTE ===\n');
    console.log(`Date: ${new Date().toISOString()}\n`);

    // 1. Find active contests
    console.log('--- CONCOURS ACTIFS ---');
    const contestsSnap = await db.collection('contests')
        .where('status', '==', 'active')
        .get();

    if (contestsSnap.empty) {
        // Try to get any recent contests if no active status
        const allContestsSnap = await db.collection('contests')
            .orderBy('endDate', 'desc')
            .limit(3)
            .get();

        if (allContestsSnap.empty) {
            console.log('Aucun concours trouvé.');
        } else {
            console.log('Derniers concours:');
            allContestsSnap.forEach(doc => {
                const data = doc.data();
                console.log(`  - ${doc.id}: ${data.title || 'Sans titre'}`);
                console.log(`    Status: ${data.status || 'non défini'}`);
                console.log(`    totalVotes: ${data.totalVotes || 0}`);
                console.log(`    endDate: ${data.endDate?.toDate?.() || 'N/A'}`);
            });
        }
    } else {
        contestsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Concours actif: ${doc.id}`);
            console.log(`  Title: ${data.title || 'N/A'}`);
            console.log(`  totalVotes: ${data.totalVotes || 0}`);
            console.log(`  totalParticipants: ${data.totalParticipants || 0}`);
            console.log(`  endDate: ${data.endDate?.toDate?.() || 'N/A'}`);
        });
    }

    // 2. Check pending vote intents (last 30 days)
    console.log('\n--- VOTE INTENTS EN PENDING ---');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pendingIntentsSnap = await db.collection('voteIntents')
        .where('status', '==', 'pending')
        .get();

    if (pendingIntentsSnap.empty) {
        console.log('Aucun voteIntent en pending.');
    } else {
        console.log(`Total voteIntents pending: ${pendingIntentsSnap.size}`);

        // Show recent ones (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentPending = [];
        pendingIntentsSnap.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.();
            if (createdAt && createdAt >= sevenDaysAgo) {
                recentPending.push({ id: doc.id, ...data, createdAt });
            }
        });

        if (recentPending.length > 0) {
            console.log(`\nVoteIntents pending des 7 derniers jours: ${recentPending.length}`);
            recentPending.slice(0, 10).forEach(intent => {
                console.log(`  - ${intent.id}`);
                console.log(`    contestId: ${intent.contestId}`);
                console.log(`    candidateId: ${intent.candidateId}`);
                console.log(`    amount: ${intent.amount} XOF`);
                console.log(`    createdAt: ${intent.createdAt?.toISOString?.() || 'N/A'}`);
            });
            if (recentPending.length > 10) {
                console.log(`  ... et ${recentPending.length - 10} autres`);
            }
        }
    }

    // 3. Check pending payments
    console.log('\n--- PAIEMENTS EN PENDING ---');
    const pendingPaymentsSnap = await db.collection('payments')
        .where('status', '==', 'pending')
        .get();

    if (pendingPaymentsSnap.empty) {
        console.log('Aucun paiement en pending.');
    } else {
        console.log(`Total paiements pending: ${pendingPaymentsSnap.size}`);

        const recentPayments = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        pendingPaymentsSnap.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || data.updatedAt?.toDate?.();
            if (createdAt && createdAt >= sevenDaysAgo) {
                recentPayments.push({ id: doc.id, ...data, createdAt });
            }
        });

        if (recentPayments.length > 0) {
            console.log(`\nPaiements pending des 7 derniers jours: ${recentPayments.length}`);
            recentPayments.slice(0, 10).forEach(payment => {
                console.log(`  - Transaction: ${payment.transactionId || payment.id}`);
                console.log(`    partnerId (intentId): ${payment.partnerId || 'N/A'}`);
                console.log(`    amount: ${payment.amount || 'N/A'} XOF`);
                console.log(`    source: ${payment.source || 'N/A'}`);
                console.log(`    event: ${payment.event || 'N/A'}`);
            });
        }
    }

    // 4. Summary
    console.log('\n--- RÉSUMÉ ---');
    console.log(`VoteIntents pending total: ${pendingIntentsSnap.size}`);
    console.log(`Paiements pending total: ${pendingPaymentsSnap.size}`);

    // Calculate potential lost votes
    let potentialLostVotes = 0;
    let potentialLostAmount = 0;
    pendingIntentsSnap.forEach(doc => {
        const data = doc.data();
        const amount = data.amount || 100;
        potentialLostVotes += Math.floor(amount / 100);
        potentialLostAmount += amount;
    });

    console.log(`\nVotes potentiellement perdus: ${potentialLostVotes}`);
    console.log(`Montant potentiellement perdu: ${potentialLostAmount} XOF`);

    console.log('\n=== FIN DU DIAGNOSTIC ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
