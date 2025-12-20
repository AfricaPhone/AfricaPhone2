const ExcelJS = require('exceljs');
const path = require('path');

const KKIAPAY_FILE = path.join(__dirname, '..', 'Affaire Vote', "LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx");

async function debugExcel() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(KKIAPAY_FILE);
    const worksheet = workbook.worksheets[0];

    console.log('--- Dumping First 10 Rows ---');
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 10) return;
        console.log(`Row ${rowNumber}:`, row.values);
    });
}

debugExcel();
