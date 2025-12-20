
const XLSX = require('xlsx');
const path = require('path');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', 'LISTE-DES-TRANSACTIONS KKIAPAY jusqu\'à maintenant.xlsx');

const workbook = XLSX.readFile(KKIAPAY_FILE);
const sheet = workbook.Sheets['SUCCESS'];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', json[0]);
console.log('Row 1:', json[1]);
console.log('Row 2:', json[2]);

// Find ID Partenaire index
const headers = json[0];
const idx = headers.indexOf('ID Partenaire');
console.log('ID Partenaire Index:', idx);
if (idx !== -1) {
    console.log('Value Row 1:', json[1][idx]);
    console.log('Value Row 2:', json[2][idx]);
}
