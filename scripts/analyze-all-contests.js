#!/usr/bin/env node

/**
 * Script pour vérifier les 787 transactions non trouvées
 * en cherchant dans TOUS les concours Firebase
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const admin = require('firebase-admin');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');

function initAdmin() {
    if (admin.apps.length > 0) return admin;

    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json',
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

async function main() {
    console.log('=== ANALYSE MULTI-CONCOURS ===\n');
    console.log(`Date: ${new Date().toISOString()}\n`);

    // 1. Lire Kkiapay
    console.log('--- 1. Lecture du fichier Kkiapay ---');
    const workbook = XLSX.readFile(KKIAPAY_FILE);
    const sheet = workbook.Sheets['SUCCESS'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < 10; i++) {
        if (rawData[i] && rawData[i][0] === 'ID Transaction') {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawData[headerRowIndex];
    const kkiapayTransactions = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0]) continue;
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx]; });
        kkiapayTransactions.push(obj);
    }
    console.log(`Total transactions: ${kkiapayTransactions.length}`);

    // 2. Charger Firebase
    console.log('\n--- 2. Chargement de TOUS les voteIntents Firebase ---');
    initAdmin();
    const db = admin.firestore();

    const allIntentsSnap = await db.collection('voteIntents').get();

    const intentsByContest = {};
    const allIntentIds = new Set();
    const pendingIntentMap = new Map();

    allIntentsSnap.forEach(doc => {
        const data = doc.data();
        allIntentIds.add(doc.id);

        const contestId = data.contestId || 'unknown';
        if (!intentsByContest[contestId]) {
            intentsByContest[contestId] = { pending: 0, counted: 0, pendingIds: new Set() };
        }

        if (data.status === 'pending') {
            intentsByContest[contestId].pending++;
            intentsByContest[contestId].pendingIds.add(doc.id);
            pendingIntentMap.set(doc.id, { contestId, candidateId: data.candidateId });
        } else if (data.status === 'counted') {
            intentsByContest[contestId].counted++;
        }
    });

    console.log('Répartition par concours:');
    Object.entries(intentsByContest).forEach(([cid, stats]) => {
        console.log(`  ${cid}: pending=${stats.pending}, counted=${stats.counted}`);
    });

    // 3. Charger les payments
    const allPaymentsSnap = await db.collection('payments').get();
    const paymentPartnerIds = new Set();
    const paymentTransactionIds = new Set();

    allPaymentsSnap.forEach(doc => {
        paymentTransactionIds.add(doc.id);
        const data = doc.data();
        if (data.partnerId) paymentPartnerIds.add(data.partnerId);
    });
    console.log(`\nPayments totaux: ${allPaymentsSnap.size}`);

    // 4. Analyser
    console.log('\n--- 3. Analyse des transactions ---');

    const lostVotesByContest = {};
    let totalLost = 0;

    for (const tx of kkiapayTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '').trim();
        const transactionId = String(tx['ID Transaction'] || '').trim();
        const amount = Number(tx['Montant'] || 0);
        const customer = tx['Nom complet client'] || '';
        const date = tx['Date'] || '';

        if (!partnerId) continue;

        // Déjà compté?
        if (paymentTransactionIds.has(transactionId)) continue;

        // Intent en pending?
        if (pendingIntentMap.has(partnerId)) {
            const info = pendingIntentMap.get(partnerId);
            const cid = info.contestId;

            if (!lostVotesByContest[cid]) {
                lostVotesByContest[cid] = [];
            }
            lostVotesByContest[cid].push({
                transactionId,
                partnerId,
                amount,
                votes: Math.floor(amount / 100),
                candidateId: info.candidateId,
                customer,
                date,
            });
            totalLost++;
        }
    }

    // 5. Résultats
    console.log('\n========================================');
    console.log('     VOTES PERDUS PAR CONCOURS         ');
    console.log('========================================\n');

    if (totalLost === 0) {
        console.log('✅ Aucun vote perdu détecté dans aucun concours!');
    } else {
        Object.entries(lostVotesByContest).forEach(([contestId, votes]) => {
            let totalVotes = 0;
            let totalAmount = 0;
            votes.forEach(v => {
                totalVotes += v.votes;
                totalAmount += v.amount;
            });

            console.log(`📌 Concours: ${contestId}`);
            console.log(`   Transactions perdues: ${votes.length}`);
            console.log(`   Votes perdus: ${totalVotes}`);
            console.log(`   Montant: ${totalAmount} XOF\n`);
        });

        // Exporter
        const timestamp = new Date().toISOString().split('T')[0];
        Object.entries(lostVotesByContest).forEach(([contestId, votes]) => {
            const safe = contestId.replace(/[^a-zA-Z0-9-]/g, '_');
            const exportPath = path.join(__dirname, '..', 'exports', `lost-votes-${safe}-${timestamp}.json`);
            fs.writeFileSync(exportPath, JSON.stringify(votes, null, 2));
            console.log(`✅ Exporté: ${exportPath}`);
        });
    }

    console.log('\n=== FIN ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
