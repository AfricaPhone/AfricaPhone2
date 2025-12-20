const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const INPUT_CSV = path.join(__dirname, '..', 'Affaire Vote', 'votes-artistes-pending-intents-2025-12-20.csv');
const OUTPUT_XLSX = path.join(__dirname, '..', 'Affaire Vote', 'votes-artistes-pending-intents-2025-12-20.xlsx');

async function convertCsvToXlsx() {
    console.log(`Reading CSV from: ${INPUT_CSV}`);

    if (!fs.existsSync(INPUT_CSV)) {
        console.error('Error: Input CSV file not found.');
        process.exit(1);
    }

    const content = fs.readFileSync(INPUT_CSV, 'utf8');
    const lines = content.trim().split('\n');

    // Create new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pending Intents');

    // Parse CSV and add to worksheet
    // Assuming standard CSV with comma delimiter
    // Handling simple quotes if present, but for now simple split

    if (lines.length > 0) {
        // Headers
        const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        worksheet.columns = headers.map(header => ({ header, key: header, width: 20 }));

        // Data
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Simple regex to handle quoted fields containing commas is better than split(',')
            // Matches: "value", value, "val,ue"
            // Simple split by semicolon (assuming no semicolons in values for now)
            const rowData = line.split(';').map(m => m.trim().replace(/^"|"$/g, ''));

            // If simple split is needed as fallback or if regex missed empty columns
            // Let's stick to simple split if simpler, but regex is safer for "Name, Surname"
            // Given the known structure, simple split might suffice but let's be robust-ish.

            // Check if row length matches headers
            if (rowData.length > 0) {
                worksheet.addRow(rowData);
            }
        }
    }

    console.log(`Writing XLSX to: ${OUTPUT_XLSX}`);
    await workbook.xlsx.writeFile(OUTPUT_XLSX);
    console.log('Conversion complete!');
}

convertCsvToXlsx().catch(err => {
    console.error('Error converting file:', err);
    process.exit(1);
});
