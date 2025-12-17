#!/usr/bin/env node

/**
 * Debug script to find transaction data in the Kkiapay Excel file
 */

const path = require('path');
const XLSX = require('xlsx');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');

console.log('Reading file:', KKIAPAY_FILE);

const workbook = XLSX.readFile(KKIAPAY_FILE);
const sheet = workbook.Sheets['SUCCESS'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total rows:', data.length);

// Find the header row (should contain 'ID Transaction' or similar)
let headerRowIndex = -1;
for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    console.log(`Row ${i}:`, JSON.stringify(row).substring(0, 300));

    if (row && Array.isArray(row)) {
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('transaction') || rowStr.includes('montant') || rowStr.includes('date')) {
            console.log(`\n>>> POSSIBLE HEADER ROW at index ${i}`);
            headerRowIndex = i;
        }
    }
}

if (headerRowIndex >= 0) {
    console.log('\n=== HEADER ROW ===');
    console.log(data[headerRowIndex]);

    console.log('\n=== FIRST 3 DATA ROWS ===');
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 4, data.length); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
}
