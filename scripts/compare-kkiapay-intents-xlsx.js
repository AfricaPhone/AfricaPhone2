const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', "LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx");
const FIREBASE_FILE = path.join(__dirname, '..', 'Affaire Vote', 'votes-artistes-pending-intents-2025-12-20.xlsx');
const REPORT_FILE = path.join(__dirname, '..', 'Affaire Vote', 'rapport_comparaison.md');

async function main() {
    console.log('--- STARTING COMPARISON ---');
    console.log(`Kkiapay File: ${KKIAPAY_FILE}`);
    console.log(`Firebase File: ${FIREBASE_FILE}`);

    // Load Kkiapay
    const workbookK = new ExcelJS.Workbook();
    await workbookK.xlsx.readFile(KKIAPAY_FILE);
    const worksheetK = workbookK.worksheets[0];

    // Load Firebase
    const workbookF = new ExcelJS.Workbook();
    await workbookF.xlsx.readFile(FIREBASE_FILE);
    const worksheetF = workbookF.worksheets[0];

    // Build Map of Firebase Intents
    const firebaseIntents = new Map();
    // Assuming Firebase XLSX headers: id, partnerId, etc. or just raw columns.
    // Based on previous CSV structure: TransactionId, PartnerId, ...

    // Let's inspect headers to be safe, but usually row 1 is header
    let fbHeaders = {};
    worksheetF.getRow(1).eachCell((cell, colNumber) => {
        fbHeaders[cell.value] = colNumber;
    });

    console.log('Firebase Headers:', Object.keys(fbHeaders));

    // === FIREBASE INTENTS ===
    // Headers are now correct in the regenerated XLSX (Row 1)
    // intentId, contestId, candidateId, amount, status, createdAt
    const colIntentIdF = 1;

    worksheetF.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers
        const intentId = row.getCell(colIntentIdF).value?.toString()?.trim();
        if (intentId) {
            firebaseIntents.set(intentId, {
                row: rowNumber,
                data: row.values
            });
        }
    });
    console.log(`Loaded ${firebaseIntents.size} Firebase intents.`);

    // === KKIAPAY TRANSACTIONS ===
    // Header is at Row 6
    // Col 2: TransactionId
    // Col 4: Amount
    // Col 11: PartnerId (This corresponds to intentId)
    // Col 13: Status (SUCCESS)

    const K_HEADER_ROW = 7; // Data starts at Row 8
    const colTxIdK = 1;
    const colAmountK = 3;
    const colPartnerIdK = 10;
    const colStatusK = 12; // Check if 12 is Status (SUCCESS/FAILED)

    let missingInFirebase = [];
    let totalMissingAmount = 0;

    worksheetK.eachRow((row, rowNumber) => {
        if (rowNumber <= K_HEADER_ROW) return; // Skip headers and metadata

        const status = row.getCell(colStatusK).value?.toString()?.toUpperCase();
        const partnerId = row.getCell(colPartnerIdK).value?.toString()?.trim();
        const txId = row.getCell(colTxIdK).value?.toString()?.trim();
        const amount = row.getCell(colAmountK).value;

        if (rowNumber < 15) {
            console.log(`[DEBUG] Row ${rowNumber}: Tx=${txId}, Partner=${partnerId}, Status=${status}, Amount=${amount}, IsSuccess=${status === 'SUCCES' || status === 'SUCCESS'}`);
        }

        // Filter for SUCCESS
        if (status === 'SUCCES' || status === 'SUCCESS') {
            if (partnerId) {
                const intent = firebaseIntents.get(partnerId);

                if (!intent) {
                    // CASE 1: TRULY ORPHANED (No intent found)
                    missingInFirebase.push({
                        transactionId: txId,
                        partnerId: partnerId,
                        amount: amount,
                        row: rowNumber,
                        reason: 'INTENT_MISSING'
                    });
                    totalMissingAmount += (Number(amount) || 0);
                } else {
                    // CASE 2: STUCK PENDING (Intent found but not counted)
                    // Column 5 is 'status' in Firebase Intent (from previous code context: intentId, contestId, candidateId, amount, status)
                    // const colStatusF = 5; (Defined implicitly by row.values index)
                    // ExcelJS values array is 1-indexed, so index 5 matches column 5.
                    const intentStatus = intent.data[5]?.toString()?.toLowerCase();

                    if (intentStatus !== 'counted' && intentStatus !== 'success') {
                        missingInFirebase.push({
                            transactionId: txId,
                            partnerId: partnerId,
                            amount: amount,
                            row: rowNumber,
                            reason: `STUCK_${intentStatus?.toUpperCase() || 'UNKNOWN'}`
                        });
                        totalMissingAmount += (Number(amount) || 0);
                    }
                }
            } else {
                console.log(`Row ${rowNumber}: Missing PartnerId for Success Tx ${txId}`);
            }
        }
    });

    console.log(`Found ${missingInFirebase.length} problematic Kkiapay transactions.`);

    // Generate Report
    let report = `# Rapport de Comparaison Kkiapay vs Firebase\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;
    report += `### Résumé\n`;
    report += `- Total Intentions Firebase chargées: ${firebaseIntents.size}\n`;
    report += `- **Transactions Problématiques (Payées mais non validées): ${missingInFirebase.length}**\n`;
    report += `- **Montant Total Impacté: ${totalMissingAmount} XOF**\n\n`;

    report += `### Détails des transactions\n`;
    report += `| TransactionId | PartnerId (Intention) | Montant | Raison | Ligne Excel |\n`;
    report += `|---|---|---|---|---|\n`;

    missingInFirebase.forEach(item => {
        report += `| ${item.transactionId} | ${item.partnerId} | ${item.amount} | ${item.reason} | ${item.row} |\n`;
    });

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`Report generated: ${REPORT_FILE}`);
}

main().catch(err => {
    console.error(err);
});
