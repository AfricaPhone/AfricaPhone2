
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Config
const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
const FIREBASE_INTENTS_CSV = path.join(__dirname, '..', 'exports', 'votes-artistes-pending-intents-2025-12-20.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'Affaire Vote', 'transactions-orphelines-v2.csv');

function main() {
    console.log('Lecture du fichier Kkiapay...');
    const workbook = XLSX.readFile(KKIAPAY_FILE);
    const sheet = workbook.Sheets['SUCCESS'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find headers
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
    console.log(`> ${kkiapayTransactions.length} transactions Kkiapay chargées.`);

    console.log('Lecture du CSV Firebase...');
    const csvContent = fs.readFileSync(FIREBASE_INTENTS_CSV, 'utf8');
    const csvLines = csvContent.trim().split('\n');
    const separator = (csvLines[0].match(/,/g) || []).length > (csvLines[0].match(/;/g) || []).length ? ',' : ';';
    const csvHeaders = csvLines[0].split(separator);

    const pendingIntents = csvLines.slice(1).map(line => {
        const values = line.split(separator);
        const obj = {};
        csvHeaders.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || ''; });
        return obj;
    });

    const currentIntentIds = new Set(pendingIntents.map(i => i.intentId));
    console.log(`> ${currentIntentIds.size} intents Firebase chargés.`);

    // Comparaison
    console.log('Analyse des orphelins...');
    const orphans = [];
    let totalOrphanAmount = 0;

    for (const tx of kkiapayTransactions) {
        const partnerId = String(tx['ID Partenaire'] || '').trim();
        if (!partnerId) continue; // Ignorer transactions sans ID Partenaire (souvent des tests ou erreurs)

        if (!currentIntentIds.has(partnerId)) {
            orphans.push(tx);
            totalOrphanAmount += Number(tx['Montant'] || 0);
        }
    }

    console.log(`\nRÉSULTATS:`);
    console.log(`Transactions orphelines trouvées : ${orphans.length}`);
    console.log(`Montant total des orphelins : ${totalOrphanAmount} XOF`);

    // Export CSV
    const csvOutput = [
        ['TransactionId', 'PartnerId', 'Montant', 'Date', 'Client', 'Telephone'].join(',')
    ];

    orphans.forEach(tx => {
        csvOutput.push([
            tx['ID Transaction'],
            tx['ID Partenaire'],
            tx['Montant'],
            `"${tx['Date']}"`,
            `"${tx['Nom complet client']}"`,
            `"${tx['Téléphone du client']}"`
        ].join(','));
    });

    fs.writeFileSync(OUTPUT_FILE, csvOutput.join('\n'));
    console.log(`\nFichier exporté : ${OUTPUT_FILE}`);
}

main();
