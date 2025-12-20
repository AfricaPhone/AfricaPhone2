
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');
const FIREBASE_EXPORT = path.join(__dirname, '..', 'exports', 'votes-artistes-full-export-2025-12-20.json');

function main() {
    // 1. Load Candidates
    console.log('Loading Firebase export...');
    if (!fs.existsSync(FIREBASE_EXPORT)) {
        console.error('Firebase export not found:', FIREBASE_EXPORT);
        return;
    }
    const firebaseData = JSON.parse(fs.readFileSync(FIREBASE_EXPORT, 'utf8'));
    const candidates = firebaseData.candidates || [];
    const candidateIds = new Set(candidates.map(c => c.id));
    const candidateNames = {};
    candidates.forEach(c => candidateNames[c.id] = c.name + (c.artistName ? ` (${c.artistName})` : ''));

    console.log(`Loaded ${candidates.length} candidates.`);

    // 2. Load Kkiapay
    console.log('Loading Kkiapay Excel:', KKIAPAY_FILE);
    if (!fs.existsSync(KKIAPAY_FILE)) {
        console.error('Kkiapay file not found:', KKIAPAY_FILE);
        return;
    }

    const workbook = xlsx.readFile(KKIAPAY_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Range 6 means start at row 6 (0-indexed? check utils). 
    // debug script uses manual reading but xlsx.utils.sheet_to_json is easier.
    // The previous debug output showed headers at line 6 (index 6, i.e. 7th row).
    // Let's inspect the headers option.
    const data = xlsx.utils.sheet_to_json(sheet, { range: 6 });

    console.log(`Loaded ${data.length} rows.`);

    let matches = 0;
    let totalSuccess = 0;

    data.forEach(row => {
        // Headers are "ID Transaction", "Status", "ID Partenaire", "Montant"
        const status = row['Status'];
        const partnerId = row['ID Partenaire'];

        if (status === 'SUCCESS' && partnerId) {
            totalSuccess++;
            if (candidateIds.has(partnerId)) {
                matches++;
                // console.log(`MATCH: PartnerID ${partnerId} is Candidate ${candidateNames[partnerId]} - Amount: ${row['Montant']}`);
            }
        }
    });

    console.log(`\nFound ${matches} transactions where PartnerID matches a Candidate ID (out of ${totalSuccess} success transactions with partnerId).`);

    if (matches > 0) {
        console.log("Hypothesis CONFIRMED: Some transactions use Candidate ID as Partner ID.");
    } else {
        console.log("Hypothesis FAILED: No matches found.");
    }
}

main();
