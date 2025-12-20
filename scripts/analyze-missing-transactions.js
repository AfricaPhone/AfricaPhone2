#!/usr/bin/env node

/**
 * Script pour analyser en détail les transactions Kkiapay
 * dont le Partner ID n'existe pas dans Firebase.
 * 
 * Ce script identifie si ces transactions peuvent être récupérées
 * en vérifiant si le Partner ID ressemble à un intentId valide.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const admin = require('firebase-admin');

const CONTEST_ID = 'votes-artistes';
const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');

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

async function main() {
    console.log('=== ANALYSE DES TRANSACTIONS NON TROUVÉES ===\n');
    console.log(`Date: ${new Date().toISOString()}\n`);

    // 1. Lire le fichier Kkiapay
    console.log('--- 1. Lecture du fichier Kkiapay ---');
    const workbook = XLSX.readFile(KKIAPAY_FILE);
    const sheet = workbook.Sheets['SUCCESS'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Trouver la ligne d'en-tête
    let headerRowIndex = -1;
    for (let i = 0; i < 10; i++) {
        if (rawData[i] && rawData[i][0] === 'ID Transaction') {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error('En-tête non trouvé!');
        return;
    }

    const headers = rawData[headerRowIndex];

    // Parser les transactions
    const kkiapayTransactions = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0]) continue;

        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx]; });
        kkiapayTransactions.push(obj);
    }

    console.log(`Total transactions Kkiapay: ${kkiapayTransactions.length}`);

    // 2. Charger Firebase
    console.log('\n--- 2. Connexion à Firebase ---');
    initAdmin();
    const db = admin.firestore();

    // 3. Récupérer TOUS les intents (pas seulement votes-artistes)
    console.log('Chargement de tous les voteIntents...');
    const allIntentsSnap = await db.collection('voteIntents').get();
    const allIntentIds = new Set();
    const intentsByContest = {};

    allIntentsSnap.forEach(doc => {
        allIntentIds.add(doc.id);
        const data = doc.data();
        const contestId = data.contestId || 'unknown';
        if (!intentsByContest[contestId]) {
            intentsByContest[contestId] = { pending: 0, counted: 0, total: 0 };
        }
        intentsByContest[contestId].total++;
        if (data.status === 'pending') intentsByContest[contestId].pending++;
        if (data.status === 'counted') intentsByContest[contestId].counted++;
    });

    console.log(`Total voteIntents dans Firebase: ${allIntentIds.size}`);
    console.log('\nRépartition par concours:');
    Object.entries(intentsByContest).forEach(([cid, stats]) => {
        console.log(`  ${cid}: ${stats.total} (pending: ${stats.pending}, counted: ${stats.counted})`);
    });

    // 4. Récupérer tous les payments
    console.log('\nChargement de tous les payments...');
    const allPaymentsSnap = await db.collection('payments').get();
    const allPaymentPartnerIds = new Set();
    const allPaymentTxIds = new Set();

    allPaymentsSnap.forEach(doc => {
        allPaymentTxIds.add(doc.id);
        const data = doc.data();
        if (data.partnerId) allPaymentPartnerIds.add(data.partnerId);
    });

    console.log(`Total payments dans Firebase: ${allPaymentsSnap.size}`);
    console.log(`Payments avec partnerId: ${allPaymentPartnerIds.size}`);

    // 5. Analyser les transactions Kkiapay
    console.log('\n--- 3. Analyse des transactions ---');

    const notFoundInIntents = [];
    const notFoundInPayments = [];
    const foundInPaymentsButNotIntents = [];
    const alreadyProcessed = [];

    for (const tx of kkiapayTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '').trim();
        const transactionId = String(tx['ID Transaction'] || '').trim();
        const amount = Number(tx['Montant'] || 0);

        if (!partnerId) continue;

        const existsInIntents = allIntentIds.has(partnerId);
        const existsInPaymentsTx = allPaymentTxIds.has(transactionId);
        const existsInPaymentsPartner = allPaymentPartnerIds.has(partnerId);

        if (existsInIntents || existsInPaymentsTx) {
            alreadyProcessed.push({ transactionId, partnerId, amount });
        } else if (existsInPaymentsPartner) {
            foundInPaymentsButNotIntents.push({ transactionId, partnerId, amount });
        } else {
            notFoundInIntents.push({
                transactionId,
                partnerId,
                amount,
                votes: Math.floor(amount / 100),
                customer: tx['Nom complet client'] || '',
                date: tx['Date'] || '',
            });
        }
    }

    // 6. Résultats
    console.log('\n========================================');
    console.log('          RÉSULTATS                    ');
    console.log('========================================');
    console.log(`Transactions déjà traitées (intent ou payment existe): ${alreadyProcessed.length}`);
    console.log(`Transactions avec payment mais pas d'intent: ${foundInPaymentsButNotIntents.length}`);
    console.log(`Transactions VRAIMENT manquantes (ni intent, ni payment): ${notFoundInIntents.length}`);

    if (notFoundInIntents.length > 0) {
        // Calculer le total
        let totalVotes = 0;
        let totalAmount = 0;
        notFoundInIntents.forEach(tx => {
            totalVotes += tx.votes;
            totalAmount += tx.amount;
        });

        console.log(`\n🔴 VOTES VRAIMENT PERDUS: ${totalVotes} voix`);
        console.log(`💰 MONTANT TOTAL: ${totalAmount} XOF`);

        console.log('\n--- Premières 20 transactions manquantes ---');
        notFoundInIntents.slice(0, 20).forEach((tx, i) => {
            console.log(`${i + 1}. ${tx.transactionId} | Partner: ${tx.partnerId} | ${tx.amount} XOF | ${tx.customer}`);
        });

        // Exporter
        const timestamp = new Date().toISOString().split('T')[0];
        const exportPath = path.join(__dirname, '..', 'exports', `kkiapay-transactions-missing-${timestamp}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(notFoundInIntents, null, 2));
        console.log(`\n✅ Liste exportée: ${exportPath}`);
    } else {
        console.log('\n✅ Toutes les transactions Kkiapay ont une correspondance dans Firebase!');
    }

    console.log('\n=== FIN DE L\'ANALYSE ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
