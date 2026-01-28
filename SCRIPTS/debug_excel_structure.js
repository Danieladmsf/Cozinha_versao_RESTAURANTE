
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const files = [
    'PEDIDOS  ROTISSERIA (BENDITO).xlsx',
    'PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx'
];

const baseDir = process.cwd();

files.forEach(file => {
    const fullPath = path.join(baseDir, file);
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ FILE NOT FOUND: ${fullPath}`);
        return;
    }

    console.log(`\n📂 Reading file: ${file}`);
    try {
        const workbook = XLSX.readFile(fullPath);
        const sheetName = workbook.SheetNames[0];
        console.log(`   Sheet Name: ${sheetName}`);

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length > 0) {
            console.log('   ✅ Headers:', JSON.stringify(data[0]));
            if (data.length > 1) {
                console.log('   👀 Sample Row:', JSON.stringify(data[1]));
            }
        } else {
            console.log('   ⚠️ Empty Sheet');
        }
    } catch (e) {
        console.error(`   ❌ Error reading file: ${e.message}`);
    }
});
