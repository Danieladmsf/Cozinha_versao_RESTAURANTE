
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const files = [
    'PEDIDOS  ROTISSERIA (BENDITO).xlsx',
    'PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx'
];

const outputFile = 'ROTISSERIA_CODES.json';
const outputTxt = 'ROTISSERIA_CODES.txt';
const baseDir = process.cwd();

const productsMap = new Map(); // Key: Code, Value: Name

files.forEach(file => {
    const fullPath = path.join(baseDir, file);
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ FILE NOT FOUND: ${fullPath}`);
        return;
    }

    console.log(`\n📂 Processing file: ${file}`);
    const workbook = XLSX.readFile(fullPath);
    const sheetName = workbook.SheetNames[0]; // Assume data is in first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Get all data
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
        console.log('   ⚠️ Too few rows');
        return;
    }

    const headerRow = data[1]; // Row 1 (0-indexed) contains column names

    // Find column pairs (Produto, Descrição)
    const columnPairs = [];
    headerRow.forEach((col, index) => {
        if (col && typeof col === 'string' && col.trim() === 'Produto') {
            // Check if next column is Descrição (loosely)
            const nextCol = headerRow[index + 1];
            if (nextCol && typeof nextCol === 'string' && nextCol.includes('Descrição')) {
                columnPairs.push({ codeIdx: index, nameIdx: index + 1 });
            }
        }
    });

    console.log(`   Found ${columnPairs.length} column blocks.`);

    // Iterate data rows (starting from index 2)
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        columnPairs.forEach(pair => {
            const code = row[pair.codeIdx];
            const name = row[pair.nameIdx];

            if (code && name) {
                // Normalize
                const codeStr = String(code).trim();
                const nameStr = String(name).trim();

                if (codeStr && nameStr && codeStr !== 'Total') {
                    if (!productsMap.has(codeStr)) {
                        productsMap.set(codeStr, nameStr);
                    }
                }
            }
        });
    }
});

// Sort by name
const sortedProducts = Array.from(productsMap.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

console.log(`\n✅ Total Unique Products: ${sortedProducts.length}`);

// Save JSON
fs.writeFileSync(path.join(baseDir, outputFile), JSON.stringify(sortedProducts, null, 2));
console.log(`Saved JSON to ${outputFile}`);

// Save TXT
const txtContent = sortedProducts.map(p => `${p.code} - ${p.name}`).join('\n');
fs.writeFileSync(path.join(baseDir, outputTxt), txtContent);
console.log(`Saved TXT to ${outputTxt}`);

// Preview
console.log('\nPreview first 10 items:');
sortedProducts.slice(0, 10).forEach(p => console.log(`${p.code} - ${p.name}`));
