#!/usr/bin/env node

/**
 * Deep comparison script to find lost votes
 * Compares Kkiapay transactions with Firebase pending intents
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
const FIREBASE_INTENTS_CSV = path.join(__dirname, '..', 'Affaire Vote', 'votes-artistes-pending-intents-2025-12-20.csv');
// const FIREBASE_FULL_EXPORT = ... (Non utilisé dans cette étape critique de comparaison Kkiapay <-> Pending)

function main() {
    console.log('=== ANALYSE DÉTAILLÉE DES VOTES PERDUS ===\n');
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
    console.log('Colonnes:', headers.join(', '));

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

    // 2. Lire les intents Firebase
    console.log('\n--- 2. Lecture des intents Firebase ---');
    const csvContent = fs.readFileSync(FIREBASE_INTENTS_CSV, 'utf8');
    const csvLines = csvContent.trim().split('\n');

    // Detect separator: count occurrences of , and ; in first line
    const firstLine = csvLines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const separator = commaCount > semiCount ? ',' : ';';
    console.log(`Séparateur détecté: "${separator}" (virgules: ${commaCount}, points-virgules: ${semiCount})`);

    const csvHeaders = csvLines[0].split(separator);
    console.log('En-têtes CSV:', csvHeaders.join(' | '));

    const pendingIntents = csvLines.slice(1).map(line => {
        const values = line.split(separator);
        const obj = {};
        csvHeaders.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || ''; });
        return obj;
    });

    console.log(`Intents pending Firebase: ${pendingIntents.length}`);
    if (pendingIntents.length > 0) {
        console.log('Premier intent (sample):', JSON.stringify(pendingIntents[0], null, 2));
    }

    // 3. Lire les votes déjà comptés
    console.log('\n--- 3. Lecture des votes comptés (SKIP - Fichier non dispo) ---');
    let countedVotes = [];
    let countedIntents = [];
    /*
    if (fs.existsSync(FIREBASE_FULL_EXPORT)) {
        const fullExport = JSON.parse(fs.readFileSync(FIREBASE_FULL_EXPORT, 'utf8'));
        countedVotes = fullExport.votes || [];
        countedIntents = fullExport.voteIntents?.counted || [];
        console.log(`Votes enregistrés: ${countedVotes.length}`);
        console.log(`Intents counted: ${countedIntents.length}`);
    }
    */

    // Créer les sets de recherche
    const pendingIntentIds = new Set(pendingIntents.map(i => String(i.intentId || '').trim()));
    const countedIntentIds = new Set(countedIntents.map(i => String(i.intentId || i.id || '').trim()));
    const countedTransactionIds = new Set(countedVotes.map(v => String(v.transactionId || v.id || '').trim()));

    console.log(`\nPending intent IDs: ${pendingIntentIds.size}`);
    console.log(`Counted intent IDs: ${countedIntentIds.size}`);
    console.log(`Counted transaction IDs: ${countedTransactionIds.size}`);

    // 4. Analyser les transactions Kkiapay
    console.log('\n--- 4. Analyse des transactions ---');

    const stats = {
        total: kkiapayTransactions.length,
        withPartnerId: 0,
        withoutPartnerId: 0,
        alreadyCounted: 0,
        inPending: 0,
        notInFirebase: 0,
    };

    const lostVotes = [];
    const notInFirebase = [];

    for (const tx of kkiapayTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '').trim();
        const transactionId = String(tx['ID Transaction'] || '').trim();
        const amount = Number(tx['Montant'] || 0);
        const date = tx['Date'] || '';
        const customer = tx['Nom complet client'] || '';
        const status = tx['Status'] || '';

        if (!partnerId) {
            stats.withoutPartnerId++;
            continue;
        }

        stats.withPartnerId++;

        // Vérifier si déjà compté
        if (countedIntentIds.has(partnerId) || countedTransactionIds.has(transactionId)) {
            stats.alreadyCounted++;
            continue;
        }

        // Vérifier si dans pending
        if (pendingIntentIds.has(partnerId)) {
            stats.inPending++;
            const intent = pendingIntents.find(i => i.intentId === partnerId);
            lostVotes.push({
                transactionId,
                partnerId,
                amount,
                date,
                customer,
                candidateId: intent?.candidateId || '',
                status,
            });
        } else {
            stats.notInFirebase++;
            notInFirebase.push({ transactionId, partnerId, amount, date, customer });
        }
    }

    // 5. Résultats
    console.log('\n========================================');
    console.log('          STATISTIQUES                 ');
    console.log('========================================');
    console.log(`Total transactions: ${stats.total}`);
    console.log(`Avec Partner ID: ${stats.withPartnerId}`);
    console.log(`Sans Partner ID: ${stats.withoutPartnerId}`);
    console.log(`Déjà comptées: ${stats.alreadyCounted}`);
    console.log(`Intent en pending (VOTES PERDUS): ${stats.inPending}`);
    console.log(`Partner ID non trouvé dans Firebase: ${stats.notInFirebase}`);

    if (lostVotes.length > 0) {
        console.log('\n========================================');
        console.log('     🔴 VOTES PERDUS DÉTECTÉS          ');
        console.log('========================================\n');

        // Grouper par candidat
        const byCandidate = {};
        lostVotes.forEach(v => {
            const cid = v.candidateId || 'INCONNU';
            if (!byCandidate[cid]) {
                byCandidate[cid] = { count: 0, amount: 0, votes: 0, details: [] };
            }
            const votes = Math.floor(v.amount / 100);
            byCandidate[cid].count++;
            byCandidate[cid].amount += v.amount;
            byCandidate[cid].votes += votes;
            byCandidate[cid].details.push(v);
        });

        let totalVotes = 0;
        let totalAmount = 0;

        console.log('--- Par candidat ---');
        Object.entries(byCandidate)
            .sort((a, b) => b[1].votes - a[1].votes)
            .forEach(([cid, data]) => {
                console.log(`  ${cid}: ${data.count} tx, ${data.votes} voix, ${data.amount} XOF`);
                totalVotes += data.votes;
                totalAmount += data.amount;
            });

        console.log(`\nTOTAL VOTES PERDUS: ${totalVotes}`);
        console.log(`TOTAL MONTANT: ${totalAmount} XOF`);

        // Exporter
        const timestamp = new Date().toISOString().split('T')[0];
        const exportPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`\n✅ Exporté: ${exportPath}`);

        // CSV
        const csvPath = path.join(__dirname, '..', 'exports', `votes-artistes-lost-${timestamp}.csv`);
        const csvHeader = 'transactionId,partnerId,amount,votes,candidateId,date,customer\n';
        const csvRows = lostVotes.map(v => {
            const votes = Math.floor(v.amount / 100);
            return `${v.transactionId},${v.partnerId},${v.amount},${votes},${v.candidateId},"${v.date}","${v.customer}"`;
        }).join('\n');
        fs.writeFileSync(csvPath, csvHeader + csvRows);
        console.log(`✅ CSV: ${csvPath}`);
    } else {
        console.log('\n✅ Aucun vote perdu détecté parmi les transactions avec Partner ID dans le pending list.');
    }

    // Afficher les transactions sans correspondance Firebase
    if (notInFirebase.length > 0) {
        console.log(`\n⚠️  ${notInFirebase.length} transactions avec Partner ID mais non trouvées dans Firebase:`);
        notInFirebase.slice(0, 10).forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.partnerId} - ${v.amount} XOF - ${v.customer}`);
        });
        if (notInFirebase.length > 10) {
            console.log(`  ... et ${notInFirebase.length - 10} autres`);
        }
    }

    console.log('\n=== FIN DE L\'ANALYSE ===');
}

main();
