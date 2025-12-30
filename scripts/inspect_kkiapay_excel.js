const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Affaire Vote', "LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx");

try {
    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    console.log('Sheet Names:', workbook.SheetNames);

    // We expect the data to be in "SUCCESS" or the first sheet if "SUCCESS" doesn't exist
    let sheetName = 'SUCCESS';
    if (!workbook.Sheets[sheetName]) {
        console.log(`Sheet "${sheetName}" not found. Using first sheet: "${workbook.SheetNames[0]}"`);
        sheetName = workbook.SheetNames[0];
    }

    const sheet = workbook.Sheets[sheetName];

    // Read first 10 rows to find header and data
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, limit: 10 });

    if (data.length === 0) {
        console.log('File appears to be empty.');
    } else {
        console.log(`\n--- Inspecting Sheet: ${sheetName} ---`);

        // Try to identify header row
        let headerRowIndex = -1;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && (row.includes('ID Transaction') || row.includes('Transaction ID') || row.includes('Id'))) {
                headerRowIndex = i;
                console.log(`Potential Header Row found at index ${i}:`, row);
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.log('Could not explicitly identify a header row containing "ID Transaction". Showing first 3 rows:');
            console.log('Row 0:', data[0]);
            console.log('Row 1:', data[1]);
            console.log('Row 2:', data[2]);
        } else {
            // Show the row immediately following the header
            if (data.length > headerRowIndex + 1) {
                console.log('Sample Data Row:', data[headerRowIndex + 1]);
            } else {
                console.log('No data rows found after header.');
            }
        }

        console.log(`\nTotal rows (approx): ${data.length} (in this preview)`);
    }

} catch (error) {
    console.error('Error reading Excel file:', error);
}
