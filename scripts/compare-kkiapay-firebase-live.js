#!/usr/bin/env node

/**
 * Script de comparaison COMPLET Kkiapay vs Firebase
 * Récupère les intents DIRECTEMENT depuis Firebase (pas depuis un fichier CSV)
 * pour être sûr d'avoir tous les pending jusqu'à maintenant.
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
    console.log('=== ANALYSE COMPLÈTE DES VOTES PERDUS ===\n');
    console.log(`Concours: ${CONTEST_ID}`);
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
        console.error('En-tête non trouvé dans le fichier Kkiapay!');
        process.exit(1);
    }

    const headers = rawData[headerRowIndex];
    console.log('Colonnes:', headers.slice(0, 10).join(', '), '...');

    // Parser les transactions
    const kkiapayTransactions = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0]) continue;

        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx]; });
        kkiapayTransactions.push(obj);
    }

    console.log(`Total transactions Kkiapay SUCCESS: ${kkiapayTransactions.length}`);

    // 2. Connexion à Firebase et récupération des données EN DIRECT
    console.log('\n--- 2. Connexion à Firebase (données en direct) ---');
    initAdmin();
    const db = admin.firestore();

    // 2a. Récupérer TOUS les voteIntents du concours votes-artistes
    console.log(`\nChargement de TOUS les voteIntents du concours "${CONTEST_ID}"...`);
    const allIntentsSnap = await db.collection('voteIntents')
        .where('contestId', '==', CONTEST_ID)
        .get();

    const pendingIntents = [];
    const countedIntents = [];
    const allIntentIds = new Set();

    allIntentsSnap.forEach(doc => {
        const data = doc.data();
        allIntentIds.add(doc.id);
        if (data.status === 'pending') {
            pendingIntents.push({ id: doc.id, ...data });
        } else if (data.status === 'counted') {
            countedIntents.push({ id: doc.id, ...data });
        }
    });

    console.log(`Total voteIntents trouvés: ${allIntentsSnap.size}`);
    console.log(`  - Pending: ${pendingIntents.length}`);
    console.log(`  - Counted: ${countedIntents.length}`);

    // 2b. Récupérer tous les votes comptabilisés
    console.log(`\nChargement des votes comptabilisés...`);
    const votesSnap = await db.collection('contests').doc(CONTEST_ID)
        .collection('votes').get();

    const countedTransactionIds = new Set();
    votesSnap.forEach(doc => {
        const data = doc.data();
        countedTransactionIds.add(doc.id);
        if (data.transactionId) countedTransactionIds.add(data.transactionId);
    });
    console.log(`Votes enregistrés: ${votesSnap.size}`);

    // 2c. Récupérer les payments
    console.log(`\nChargement des payments...`);
    const paymentsSnap = await db.collection('payments')
        .where('contestId', '==', CONTEST_ID)
        .get();

    const paymentPartnerIds = new Set();
    const paymentTransactionIds = new Set();
    paymentsSnap.forEach(doc => {
        paymentTransactionIds.add(doc.id);
        const data = doc.data();
        if (data.partnerId) paymentPartnerIds.add(data.partnerId);
        if (data.transactionId) paymentTransactionIds.add(data.transactionId);
    });
    console.log(`Payments trouvés: ${paymentsSnap.size}`);

    // Créer le set des pending IDs
    const pendingIntentIds = new Set(pendingIntents.map(i => i.id));
    const countedIntentIds = new Set(countedIntents.map(i => i.id));

    // 3. Analyse des transactions Kkiapay
    console.log('\n--- 3. Analyse des transactions Kkiapay ---');

    const lostVotes = [];
    const alreadyCounted = [];
    const noIntentFound = [];
    const noPartnerId = [];

    for (const tx of kkiapayTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '').trim();
        const transactionId = String(tx['ID Transaction'] || '').trim();
        const amount = Number(tx['Montant'] || 0);
        const date = tx['Date'] || '';
        const customer = tx['Nom complet client'] || '';

        if (!partnerId) {
            noPartnerId.push({ transactionId, amount, customer, date });
            continue;
        }

        // Vérifier si la transaction est déjà comptée
        if (countedIntentIds.has(partnerId) ||
            countedTransactionIds.has(transactionId) ||
            paymentTransactionIds.has(transactionId)) {
            alreadyCounted.push({ transactionId, partnerId, amount });
            continue;
        }

        // Vérifier si l'intent est en pending (= VOTE PERDU!)
        if (pendingIntentIds.has(partnerId)) {
            const intent = pendingIntents.find(i => i.id === partnerId);
            lostVotes.push({
                transactionId,
                partnerId,
                amount,
                votes: Math.floor(amount / 100),
                candidateId: intent?.candidateId || '',
                contestId: intent?.contestId || CONTEST_ID,
                date,
                customer,
            });
            continue;
        }

        // Partner ID non trouvé dans Firebase
        noIntentFound.push({
            transactionId,
            partnerId,
            amount,
            votes: Math.floor(amount / 100),
            date,
            customer,
        });
    }

    // 4. Résultats
    console.log('\n========================================');
    console.log('          RÉSULTATS DE L\'ANALYSE        ');
    console.log('========================================');
    console.log(`Total transactions Kkiapay: ${kkiapayTransactions.length}`);
    console.log(`Sans Partner ID: ${noPartnerId.length}`);
    console.log(`Déjà comptées (OK): ${alreadyCounted.length}`);
    console.log(`Partner ID non trouvé dans Firebase: ${noIntentFound.length}`);
    console.log(`\n🔴 VOTES PERDUS (paiement SUCCESS mais intent pending): ${lostVotes.length}`);

    if (lostVotes.length > 0) {
        // Grouper par candidat
        const byCandidate = {};
        let totalVotes = 0;
        let totalAmount = 0;

        lostVotes.forEach(v => {
            const cid = v.candidateId || 'INCONNU';
            if (!byCandidate[cid]) {
                byCandidate[cid] = { count: 0, amount: 0, votes: 0, details: [] };
            }
            byCandidate[cid].count++;
            byCandidate[cid].amount += v.amount;
            byCandidate[cid].votes += v.votes;
            byCandidate[cid].details.push(v);
            totalVotes += v.votes;
            totalAmount += v.amount;
        });

        console.log('\n--- VOTES PERDUS PAR CANDIDAT ---');
        Object.entries(byCandidate)
            .sort((a, b) => b[1].votes - a[1].votes)
            .forEach(([cid, data]) => {
                console.log(`  ${cid}: ${data.count} tx, ${data.votes} voix, ${data.amount} XOF`);
            });

        console.log('\n========================================');
        console.log(`🔴 TOTAL VOTES PERDUS: ${totalVotes} voix`);
        console.log(`💰 TOTAL MONTANT: ${totalAmount} XOF`);
        console.log('========================================');

        // Exporter les votes perdus
        const timestamp = new Date().toISOString().split('T')[0];
        const exportPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`\n✅ Liste exportée: ${exportPath}`);

        // CSV aussi
        const csvPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.csv`);
        const csvHeader = 'transactionId,partnerId,amount,votes,candidateId,date,customer\n';
        const csvRows = lostVotes.map(v => {
            return `${v.transactionId},${v.partnerId},${v.amount},${v.votes},${v.candidateId},"${v.date}","${v.customer}"`;
        }).join('\n');
        fs.writeFileSync(csvPath, csvHeader + csvRows);
        console.log(`✅ CSV exporté: ${csvPath}`);
    } else {
        console.log('\n✅ Aucun vote perdu détecté !');
        console.log('Tous les paiements SUCCESS ont leurs intents correctement comptés.');
    }

    // Afficher quelques exemples de Partner ID non trouvés
    if (noIntentFound.length > 0) {
        console.log(`\n⚠️  ${noIntentFound.length} transactions avec Partner ID non trouvé dans le concours "${CONTEST_ID}":`);
        noIntentFound.slice(0, 10).forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.partnerId} - ${v.amount} XOF - ${v.customer}`);
        });
        if (noIntentFound.length > 10) {
            console.log(`  ... et ${noIntentFound.length - 10} autres`);
        }
        console.log('\n  Note: Ces transactions peuvent appartenir à un autre concours ou avoir des Partner IDs invalides.');
    }

    console.log('\n=== FIN DE L\'ANALYSE ===\n');
    process.exit(0);
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
