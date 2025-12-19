#!/usr/bin/env node

/**
 * Compare Kkiapay transactions with Firebase data to find lost votes
 * Version 3 - Correct parsing for the new Excel format
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
const FIREBASE_INTENTS_CSV = path.join(__dirname, '..', 'exports', 'votes-artistes-pending-intents-2025-12-19.csv');
const FIREBASE_FULL_EXPORT = path.join(__dirname, '..', 'exports', 'votes-artistes-full-export-2025-12-19.json');

function main() {
    console.log('=== COMPARAISON KKIAPAY vs FIREBASE (17 Décembre 2025) ===\n');
    console.log(`Date: ${new Date().toISOString()}`);

    // Check files exist
    if (!fs.existsSync(KKIAPAY_FILE)) {
        console.error(`Fichier Kkiapay non trouvé: ${KKIAPAY_FILE}`);
        process.exit(1);
    }

    if (!fs.existsSync(FIREBASE_INTENTS_CSV)) {
        console.error(`Fichier Firebase CSV non trouvé: ${FIREBASE_INTENTS_CSV}`);
        process.exit(1);
    }

    console.log(`\nFichier Kkiapay: ${path.basename(KKIAPAY_FILE)}`);
    console.log(`Fichier Firebase: ${path.basename(FIREBASE_INTENTS_CSV)}`);

    // Read Kkiapay Excel file with correct parsing
    console.log('\n--- Lecture du fichier Kkiapay ---');
    const workbook = XLSX.readFile(KKIAPAY_FILE);
    const sheetName = workbook.SheetNames[0]; // Should be 'SUCCESS'
    console.log(`Feuille utilisée: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find header row (should be row 6, index 6)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row[0] === 'ID Transaction') {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error('En-tête non trouvé dans le fichier Excel');
        process.exit(1);
    }

    console.log(`En-tête trouvé à la ligne ${headerRowIndex}`);
    const headers = rawData[headerRowIndex];

    // Parse data rows
    const kkiapayData = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0]) continue; // Skip empty rows

        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx];
        });
        kkiapayData.push(obj);
    }

    console.log(`Transactions Kkiapay trouvées: ${kkiapayData.length}`);

    // Filter SUCCESS transactions
    const successTransactions = kkiapayData.filter(row => {
        const status = String(row['Status'] || '').toUpperCase();
        return status === 'SUCCESS';
    });
    console.log(`Transactions SUCCESS: ${successTransactions.length}`);

    // Read Firebase pending intents
    console.log('\n--- Lecture des intents Firebase ---');
    const csvContent = fs.readFileSync(FIREBASE_INTENTS_CSV, 'utf8');
    const lines = csvContent.trim().split('\n');
    const csvHeaders = lines[0].split(',');

    const pendingIntents = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        csvHeaders.forEach((h, i) => {
            obj[h.trim()] = values[i]?.trim() || '';
        });
        return obj;
    });
    console.log(`Pending intents Firebase: ${pendingIntents.length}`);

    // Read full export to get counted votes
    let countedVotes = [];
    if (fs.existsSync(FIREBASE_FULL_EXPORT)) {
        const fullExport = JSON.parse(fs.readFileSync(FIREBASE_FULL_EXPORT, 'utf8'));
        countedVotes = fullExport.votes || [];
        console.log(`Votes déjà comptés: ${countedVotes.length}`);
    }

    // Create sets for quick lookup
    const pendingIntentIds = new Set(pendingIntents.map(i => i.intentId));
    const countedTransactionIds = new Set(countedVotes.map(v => String(v.transactionId || v.id)));

    // Find lost votes: SUCCESS in Kkiapay but pending in Firebase (or not counted)
    console.log('\n--- Recherche des votes perdus ---');

    const lostVotes = [];

    for (const tx of successTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '');
        const transactionId = String(tx['ID Transaction'] || '');
        const amount = Number(tx['Montant'] || 0);
        const date = tx['Date'] || '';
        const customer = tx['Nom complet client'] || '';

        // Skip if no partnerId
        if (!partnerId) continue;

        // Check if this transaction is already counted
        if (countedTransactionIds.has(transactionId)) {
            continue; // Already counted, skip
        }

        // Check if the partnerId matches a pending intent
        if (pendingIntentIds.has(partnerId)) {
            // Find the intent to get candidateId
            const intent = pendingIntents.find(i => i.intentId === partnerId);

            lostVotes.push({
                transactionId,
                partnerId,
                amount,
                date,
                customer,
                candidateId: intent?.candidateId || '',
                intentAmount: intent?.amount || '',
            });
        }
    }

    console.log(`\n🔴 VOTES PERDUS TROUVÉS: ${lostVotes.length}`);

    if (lostVotes.length > 0) {
        // Calculate totals
        const totalAmount = lostVotes.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
        const totalVotes = lostVotes.reduce((sum, v) => sum + Math.floor((Number(v.amount) || 0) / 100), 0);

        console.log(`Total montant: ${totalAmount.toLocaleString('fr-FR')} XOF`);
        console.log(`Total voix perdues: ${totalVotes}`);

        // Group by candidate
        const byCandidate = {};
        lostVotes.forEach(v => {
            const cid = v.candidateId || 'unknown';
            if (!byCandidate[cid]) {
                byCandidate[cid] = { count: 0, amount: 0, votes: 0 };
            }
            byCandidate[cid].count++;
            byCandidate[cid].amount += Number(v.amount) || 0;
            byCandidate[cid].votes += Math.floor((Number(v.amount) || 0) / 100);
        });

        console.log('\n--- Par candidat ---');
        Object.entries(byCandidate)
            .sort((a, b) => b[1].votes - a[1].votes)
            .forEach(([cid, data]) => {
                console.log(`  ${cid}: ${data.count} tx, ${data.votes} voix, ${data.amount} XOF`);
            });

        // Show details
        console.log('\n--- Détails des votes perdus ---');
        lostVotes.forEach((v, i) => {
            const votes = Math.floor((Number(v.amount) || 0) / 100);
            console.log(`${i + 1}. ${v.customer} - ${v.amount} XOF (${votes} voix) - ${v.date}`);
        });

        // Export lost votes
        const timestamp = new Date().toISOString().split('T')[0];
        const exportPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`\n✅ Exporté: ${exportPath}`);

        // Export CSV
        const csvPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.csv`);
        const csvHeader = 'transactionId,partnerId,amount,date,customer,candidateId,votes\n';
        const csvRows = lostVotes.map(v => {
            const votes = Math.floor((Number(v.amount) || 0) / 100);
            return `${v.transactionId},${v.partnerId},${v.amount},${v.date},"${v.customer}",${v.candidateId},${votes}`;
        }).join('\n');
        fs.writeFileSync(csvPath, csvHeader + csvRows);
        console.log(`✅ Exporté: ${csvPath}`);

    } else {
        console.log('\n✅ Aucun vote perdu détecté !');
    }

    console.log('\n=== FIN DE LA COMPARAISON ===');
}

main();
