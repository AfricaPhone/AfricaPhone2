const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Affaire Vote', 'vote_intents_export_2025-12-29T11-09-34-049Z.xlsx');

try {
    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read first 5 rows to check structure
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, limit: 5 });

    if (data.length === 0) {
        console.log('File is empty.');
    } else {
        console.log('Headers:', data[0]);
        console.log('First row data:', data[1]);
        console.log('Total rows (approx):', data.length);
    }
} catch (error) {
    console.error('Error reading Excel file:', error);
}
