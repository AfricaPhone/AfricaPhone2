
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Files
const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
// We need to compare against pending AND counted.
// Pending: exports/votes-artistes-pending-intents-2025-12-20.csv (or .json if available)
// Counted: exports/votes-artistes-full-export-2025-12-20.json (contains voteIntents.counted)

const PENDING_CSV = path.join(__dirname, '..', 'exports', 'votes-artistes-pending-intents-2025-12-20.csv');
const FULL_EXPORT = path.join(__dirname, '..', 'exports', 'votes-artistes-full-export-2025-12-20.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'exports', 'kkiapay-transactions-missing-2025-12-20.json');

function main() {
    console.log('--- Extracting Missing Transactions ---');

    // 1. Load Known IDs (Pending + Counted)
    const knownIds = new Set();

    // Pending
    if (fs.existsSync(PENDING_CSV)) {
        const content = fs.readFileSync(PENDING_CSV, 'utf8');
        const lines = content.split('\n');
        // Detect separator
        const header = lines[0];
        const sep = header.includes(';') ? ';' : ',';

        lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const cols = line.split(sep);
            const intentId = cols[0].trim(); // intentId is first column
            if (intentId) knownIds.add(intentId);
        });
        console.log(`Loaded Pending Intents from CSV. Total known IDs: ${knownIds.size}`);
    }

    // Counted (from full export)
    if (fs.existsSync(FULL_EXPORT)) {
        const data = JSON.parse(fs.readFileSync(FULL_EXPORT, 'utf8'));
        const counted = data.voteIntents?.counted || [];
        counted.forEach(intent => {
            if (intent.intentId) knownIds.add(intent.intentId);
        });
        console.log(`Loaded Counted Intents. Total known IDs: ${knownIds.size}`);
    }

    // 2. Load Kkiapay
    if (!fs.existsSync(KKIAPAY_FILE)) {
        console.error('Kkiapay file not found');
        return;
    }
    const workbook = xlsx.readFile(KKIAPAY_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { range: 6 });

    const missing = [];

    rows.forEach(row => {
        const status = row['Status'];
        const partnerId = row['ID Partenaire'];
        const txId = row['ID Transaction'];
        const amount = row['Montant'];
        const date = row['Date'];
        const customer = row['Nom complet client'];

        if (status === 'SUCCESS' && partnerId) {
            if (!knownIds.has(partnerId)) {
                missing.push({
                    transactionId: txId,
                    partnerId: partnerId,
                    amount: amount,
                    status: status,
                    date: date,
                    customer: customer
                });
            }
        }
    });

    console.log(`Found ${missing.length} missing transactions (PartnerID not in Firebase).`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(missing, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

main();
