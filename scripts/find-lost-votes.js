#!/usr/bin/env node

/**
 * Script to identify truly lost votes:
 * VoteIntents that are still 'pending' but have a successful payment in Kkiapay.
 * 
 * Method:
 * 1. Get all payments with status 'success'
 * 2. For each, check if the corresponding voteIntent is still 'pending'
 * 3. If yes, this is a lost vote that needs to be recovered
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

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

async function main() {
    initAdmin();
    const db = admin.firestore();

    console.log('\n=== IDENTIFICATION DES VOTES PERDUS ===\n');
    console.log(`Date: ${new Date().toISOString()}\n`);

    // 1. Get all pending voteIntents
    console.log('Chargement des voteIntents pending...');
    const pendingIntentsSnap = await db.collection('voteIntents')
        .where('status', '==', 'pending')
        .get();

    const pendingIntentsMap = new Map();
    pendingIntentsSnap.forEach(doc => {
        pendingIntentsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    console.log(`VoteIntents pending trouvés: ${pendingIntentsMap.size}`);

    // 2. Get all successful payments
    console.log('\nChargement des paiements success...');
    const successPaymentsSnap = await db.collection('payments')
        .where('status', '==', 'success')
        .get();

    console.log(`Paiements success trouvés: ${successPaymentsSnap.size}`);

    // 3. Find lost votes: payment success but voteIntent still pending
    console.log('\n--- ANALYSE DES VOTES PERDUS ---\n');

    const lostVotes = [];
    const alreadyCounted = [];
    const noIntent = [];

    successPaymentsSnap.forEach(doc => {
        const payment = doc.data();
        const partnerId = payment.partnerId;

        if (!partnerId) {
            noIntent.push({ transactionId: doc.id, payment });
            return;
        }

        const intent = pendingIntentsMap.get(partnerId);
        if (intent) {
            // This is a lost vote! Payment succeeded but intent is still pending
            lostVotes.push({
                transactionId: doc.id,
                partnerId,
                amount: payment.amount,
                contestId: intent.contestId || payment.contestId,
                candidateId: intent.candidateId || payment.candidateId,
                intentCreatedAt: intent.createdAt?.toDate?.(),
                paymentVerifiedAt: payment.verifiedAt || payment.updatedAt?.toDate?.(),
                voterInfo: payment.voterName || payment.phone || 'N/A',
            });
        }
    });

    // 4. Also check if any pending intents have a payment at all
    console.log('Recherche de voteIntents pending sans paiement correspondant...');

    // Create a set of partnerIds that have a payment
    const partnerIdsWithPayment = new Set();
    successPaymentsSnap.forEach(doc => {
        const payment = doc.data();
        if (payment.partnerId) {
            partnerIdsWithPayment.add(payment.partnerId);
        }
    });

    // Check pending intents against all payments (not just success)
    const allPaymentsSnap = await db.collection('payments').get();
    const allPartnerIds = new Set();
    allPaymentsSnap.forEach(doc => {
        const payment = doc.data();
        if (payment.partnerId) {
            allPartnerIds.add(payment.partnerId);
        }
    });

    const intentsWithNoPayment = [];
    const intentsWithPendingPayment = [];

    pendingIntentsSnap.forEach(doc => {
        const intentId = doc.id;
        if (!partnerIdsWithPayment.has(intentId) && !allPartnerIds.has(intentId)) {
            // No payment record at all - user probably abandoned
            intentsWithNoPayment.push(intentId);
        }
    });

    // 5. Summary
    console.log('\n========================================');
    console.log('           RÉSUMÉ DES RÉSULTATS        ');
    console.log('========================================\n');

    console.log(`📊 VoteIntents en 'pending': ${pendingIntentsMap.size}`);
    console.log(`📊 Paiements 'success' total: ${successPaymentsSnap.size}`);
    console.log(`📊 Paiements sans partnerId: ${noIntent.length}`);
    console.log('');
    console.log(`🚨 VOTES PERDUS (paiement success, intent pending): ${lostVotes.length}`);
    console.log(`⚪ Intents sans aucun paiement (abandons probables): ${intentsWithNoPayment.length}`);

    if (lostVotes.length > 0) {
        console.log('\n========================================');
        console.log('        VOTES PERDUS À RÉCUPÉRER       ');
        console.log('========================================\n');

        let totalLostAmount = 0;
        let totalLostVotes = 0;

        lostVotes.forEach((lost, index) => {
            const votes = Math.floor((lost.amount || 100) / 100);
            totalLostVotes += votes;
            totalLostAmount += lost.amount || 100;

            console.log(`${index + 1}. Transaction: ${lost.transactionId}`);
            console.log(`   Intent ID: ${lost.partnerId}`);
            console.log(`   Montant: ${lost.amount} XOF = ${votes} voix`);
            console.log(`   Concours: ${lost.contestId}`);
            console.log(`   Candidat: ${lost.candidateId}`);
            console.log(`   Date: ${lost.paymentVerifiedAt || lost.intentCreatedAt || 'N/A'}`);
            console.log('');
        });

        console.log('========================================');
        console.log(`TOTAL VOTES PERDUS: ${totalLostVotes} voix`);
        console.log(`TOTAL MONTANT: ${totalLostAmount} XOF`);
        console.log('========================================\n');

        // Export to JSON for potential backfill
        const exportPath = path.join(process.cwd(), 'exports', `lost-votes-${new Date().toISOString().split('T')[0]}.json`);
        fs.mkdirSync(path.dirname(exportPath), { recursive: true });
        fs.writeFileSync(exportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`📁 Liste exportée vers: ${exportPath}`);
    } else {
        console.log('\n✅ Aucun vote perdu détecté !');
        console.log('Tous les paiements success ont leurs intents correctement marqués "counted".');
    }

    console.log('\n=== FIN DE L\'ANALYSE ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
