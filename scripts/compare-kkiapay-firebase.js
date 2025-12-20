#!/usr/bin/env node

/**
 * Compare Kkiapay transactions with Firebase pending voteIntents
 * to find votes that were paid but not counted.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const KKIAPAY_FILE = path.join(AFFAIRE_VOTE_DIR, 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
const PENDING_INTENTS_FILE = path.join(AFFAIRE_VOTE_DIR, 'votes-artistes-pending-intents-2025-12-20.csv');

function readKkiapayExcel(filePath) {
    console.log(`\nLecture du fichier Excel Kkiapay: ${path.basename(filePath)}`);

    const workbook = XLSX.readFile(filePath);

    // Use Concours_artistes sheet if available
    let sheetName = 'Concours_artistes';
    if (!workbook.SheetNames.includes(sheetName)) {
        sheetName = workbook.SheetNames[0];
    }

    console.log(`  - Feuille utilisée: ${sheetName}`);
    console.log(`  - Feuilles disponibles: ${workbook.SheetNames.join(', ')}`);

    const sheet = workbook.Sheets[sheetName];

    // Read as array of arrays first to get headers correctly
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
        console.log('  - Pas assez de données');
        return [];
    }

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
        if (rawData[i] && (rawData[i][0] === 'ID Transaction' || rawData[i].includes('ID Transaction'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.log('  - En-tête non trouvé (ID Transaction)');
        // Fallback to row 0 if not found, though unlikely to work
        headerRowIndex = 0;
    }

    const headers = rawData[headerRowIndex];
    console.log(`  - Colonnes (ligne ${headerRowIndex}): ${headers.join(', ')}`);

    // Convert to objects
    const data = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const obj = {};
        headers.forEach((header, idx) => {
            obj[header] = row[idx] !== undefined ? row[idx] : '';
        });
        data.push(obj);
    }

    console.log(`  - Transactions: ${data.length}`);

    return data;
}

function readPendingIntentsCSV(filePath) {
    console.log(`\nLecture du fichier CSV Firebase: ${path.basename(filePath)}`);

    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(line => line.trim());

    if (lines.length <= 1) {
        console.log('  - Fichier vide ou sans données');
        return [];
    }

    const headers = lines[0].split(';');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });
        data.push(row);
    }

    console.log(`  - Lignes: ${data.length}`);
    console.log(`  - Colonnes: ${headers.join(', ')}`);

    return data;
}

function normalizePartnerId(value) {
    if (!value) return null;
    return String(value).trim();
}

function main() {
    console.log('=== COMPARAISON KKIAPAY vs FIREBASE ===\n');
    console.log(`Date: ${new Date().toISOString()}`);

    // Check files exist
    if (!fs.existsSync(KKIAPAY_FILE)) {
        console.error(`Fichier Kkiapay non trouvé: ${KKIAPAY_FILE}`);
        process.exit(1);
    }

    if (!fs.existsSync(PENDING_INTENTS_FILE)) {
        console.error(`Fichier Firebase non trouvé: ${PENDING_INTENTS_FILE}`);
        process.exit(1);
    }

    // Read files
    const kkiapayTransactions = readKkiapayExcel(KKIAPAY_FILE);
    const pendingIntents = readPendingIntentsCSV(PENDING_INTENTS_FILE);

    // Create set of pending intent IDs
    const pendingIntentIds = new Set();
    const pendingIntentsMap = new Map();
    pendingIntents.forEach(intent => {
        const id = normalizePartnerId(intent.intentId);
        if (id) {
            pendingIntentIds.add(id);
            pendingIntentsMap.set(id, intent);
        }
    });

    console.log(`\n--- ANALYSE ---`);
    console.log(`Pending intents Firebase: ${pendingIntentIds.size}`);
    console.log(`Transactions Kkiapay: ${kkiapayTransactions.length}`);

    // Column names (from the Concours_artistes sheet)
    const PARTNER_ID_COL = 'ID Partenaire';
    const TRANSACTION_ID_COL = 'ID Transaction';
    const AMOUNT_COL = 'Montant';
    const DATE_COL = 'Date';
    const CUSTOMER_COL = 'Nom complet client';
    const STATUS_COL = 'Status';

    // Filter SUCCESS transactions
    const successTransactions = kkiapayTransactions.filter(tx => {
        const status = String(tx[STATUS_COL] || '').toUpperCase();
        return status === 'SUCCESS';
    });

    console.log(`Transactions SUCCESS: ${successTransactions.length}`);

    // Find lost votes: SUCCESS in Kkiapay but pending in Firebase
    const lostVotes = [];
    const noPartnerId = [];

    successTransactions.forEach(tx => {
        const partnerId = normalizePartnerId(tx[PARTNER_ID_COL]);
        const transactionId = tx[TRANSACTION_ID_COL];
        const amount = tx[AMOUNT_COL];
        const date = tx[DATE_COL];
        const customer = tx[CUSTOMER_COL];

        if (!partnerId) {
            noPartnerId.push({ transactionId, amount, date, customer });
            return;
        }

        if (pendingIntentIds.has(partnerId)) {
            // This is a lost vote!
            const intent = pendingIntentsMap.get(partnerId);
            lostVotes.push({
                transactionId,
                partnerId,
                amount,
                date,
                customer,
                candidateId: intent ? intent.candidateId : 'N/A',
                intentAmount: intent ? intent.amount : 'N/A',
            });
        }
    });

    // Results
    console.log('\n========================================');
    console.log('         RÉSULTATS DE LA COMPARAISON   ');
    console.log('========================================\n');

    console.log(`Transactions SUCCESS Kkiapay: ${successTransactions.length}`);
    console.log(`Sans Partner ID: ${noPartnerId.length}`);
    console.log(`Pending intents Firebase: ${pendingIntentIds.size}`);
    console.log('');
    console.log(`🚨 VOTES PERDUS (payés mais non comptés): ${lostVotes.length}`);

    if (lostVotes.length > 0) {
        console.log('\n========================================');
        console.log('          VOTES PERDUS DÉTECTÉS        ');
        console.log('========================================\n');

        let totalAmount = 0;
        let totalVotes = 0;

        lostVotes.forEach((vote, idx) => {
            const amount = Number(vote.amount) || 0;
            const votes = Math.floor(amount / 100);
            totalAmount += amount;
            totalVotes += votes;

            console.log(`${idx + 1}. Transaction: ${vote.transactionId}`);
            console.log(`   Partner ID (Intent): ${vote.partnerId}`);
            console.log(`   Montant: ${amount} XOF = ${votes} voix`);
            console.log(`   Candidat: ${vote.candidateId}`);
            console.log(`   Date: ${vote.date || 'N/A'}`);
            console.log(`   Client: ${vote.customer || 'N/A'}`);
            console.log('');
        });

        console.log('========================================');
        console.log(`TOTAL VOTES PERDUS: ${totalVotes} voix`);
        console.log(`TOTAL MONTANT: ${totalAmount} XOF`);
        console.log('========================================\n');

        // Export lost votes
        const exportPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`📁 Liste exportée: ${exportPath}`);

        // CSV export
        const csvLines = ['transactionId,partnerId,amount,votes,candidateId,date,customer'];
        lostVotes.forEach(vote => {
            const amount = Number(vote.amount) || 0;
            const votes = Math.floor(amount / 100);
            csvLines.push(`${vote.transactionId},${vote.partnerId},${amount},${votes},${vote.candidateId},"${vote.date || ''}","${vote.customer || ''}"`);
        });
        const csvPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${new Date().toISOString().split('T')[0]}.csv`);
        fs.writeFileSync(csvPath, csvLines.join('\n'));
        console.log(`📁 CSV exporté: ${csvPath}`);
    } else {
        console.log('\n✅ Aucun vote perdu détecté !');
        console.log('Toutes les transactions SUCCESS de Kkiapay ont été correctement comptées.');
    }

    console.log('\n=== FIN DE LA COMPARAISON ===\n');
}

main();
