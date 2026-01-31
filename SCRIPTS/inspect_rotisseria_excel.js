
import xlsx from 'xlsx';
import path from 'path';

const FILE_PATH = 'c:/APP COZINHA/PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx'; // Note simple space vs double space? List output showed double space "PEDIDOS  ROTISSERIA"

function inspect() {
    console.log(`Reading file: ${FILE_PATH}`);
    try {
        const workbook = xlsx.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        console.log(`Sheet Name: ${sheetName}`);

        const sheet = workbook.Sheets[sheetName];
        // Get range
        const range = xlsx.utils.decode_range(sheet['!ref']);
        console.log(`Range: ${sheet['!ref']} (Rows: ${range.e.r + 1})`);

        // Dump first 10 rows as JSON
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 10 });
        console.log('--- First 10 Rows ---');
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Error reading file:', err);
    }
}

inspect();
