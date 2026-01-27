
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'ESCALA DE PRODUÇÃO ROTISSERIA.xlsx');

console.log(`Checking for file at: ${filePath}`);

if (!fs.existsSync(filePath)) {
    console.error(`File NOT FOUND at ${filePath}`);
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Get headers
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    const data = XLSX.utils.sheet_to_json(sheet).slice(0, 5); // Get first 5 rows as objects

    console.log(`Sheet Name: ${sheetName}`);
    console.log('Headers:', headers);
    console.log('First 5 rows (json):');
    console.log(JSON.stringify(data, null, 2));

} catch (error) {
    console.error('Error reading file:', error);
}
