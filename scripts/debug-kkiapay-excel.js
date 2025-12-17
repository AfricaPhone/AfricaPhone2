#!/usr/bin/env node

/**
 * Debug script to analyze the Kkiapay Excel file structure
 */

const path = require('path');
const XLSX = require('xlsx');

const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const KKIAPAY_FILE = path.join(AFFAIRE_VOTE_DIR, 'LISTE-DES-TRANSACTIONS KKIAPAY.xlsx');

console.log('=== ANALYSE DU FICHIER EXCEL KKIAPAY ===\n');

const workbook = XLSX.readFile(KKIAPAY_FILE);

console.log('Feuilles disponibles:', workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Feuille: ${sheetName} ---`);

    const sheet = workbook.Sheets[sheetName];

    // Get the range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    console.log(`Range: ${sheet['!ref']}`);
    console.log(`Lignes: ${range.e.r - range.s.r + 1}, Colonnes: ${range.e.c - range.s.c + 1}`);

    // Show first 10 rows with all columns
    console.log('\nPremières lignes (brut):');

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let i = 0; i < Math.min(15, data.length); i++) {
        const row = data[i];
        if (row && row.length > 0) {
            console.log(`Ligne ${i}: ${JSON.stringify(row.slice(0, 15))}`);
        }
    }
});

console.log('\n=== FIN ===');
