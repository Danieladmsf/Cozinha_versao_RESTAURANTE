
import xlsx from 'xlsx';
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, updateDoc, doc } from 'firebase/firestore';

const filePath = 'C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\public\\Planilha sem título (2).xlsx';

function normalize(str) {
    if (!str) return '';
    return str.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function main() {
    console.log("📥 Lendo planilha...");
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['DADOS DE VENDA'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // The structure has repeating columns. 
    // Headers are in row 0. 
    // We'll search for 'Produto', 'Descrição', 'Código de Barras'
    // They appear every 5 columns starting roughly at index 1

    // In the sample, row 0 headers might be empty or days.
    // Row 1 actually had the "Produto", "Descrição", "Código de Barras" headers.

    let productCodes = new Map(); // normalizedName -> code

    const maxCols = data[1].length;

    for (let r = 2; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        for (let c = 0; c < maxCols; c++) {
            // Assume the pattern: Produto, Descrição, Código de Barras
            // By looking at the first 3 lines of output, the string 'Produto' is at indices: 1, 6, 11, 16...
            // Let's just find any cell that is a string, and if the cell before it is a number.
            // Actually, we can just iterate and look for a number in col c, strong text in c+1, and same number in c+2
            const cell1 = row[c];
            const cell2 = row[c + 1];

            if (typeof cell1 === 'number' && typeof cell2 === 'string') {
                const code = cell1;
                const name = cell2;
                if (name && name.length > 5 && !name.includes('DIA DE INVENTARIO')) {
                    const norm = normalize(name);
                    productCodes.set(norm, code.toString());
                }
            }
        }
    }

    console.log(`Encontrados ${productCodes.size} códigos únicos na planilha.`);

    // Agora buscar do banco:
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    const prodSnap = await getDocsFromServer(collection(db, "Product"));

    let matchCountR = 0;
    let matchCountP = 0;

    console.log("\n🔄 Atualizando Recipe (Receitas/Refeições)...");
    for (const r of recSnap.docs) {
        const d = r.data();
        if (!d.name) continue;
        const normName = normalize(d.name);

        if (productCodes.has(normName)) {
            const code = productCodes.get(normName);
            if (d.code !== code || d.id_vr !== code) {
                await updateDoc(r.ref, { code: code, id_vr: code });
                matchCountR++;
                console.log(`  [Recipe ✅] Matched: "${d.name}" -> ${code}`);
            }
        }
    }

    console.log("\n🔄 Atualizando Product (Produtos Base/SKU)...");
    for (const p of prodSnap.docs) {
        const d = p.data();
        if (!d.name) continue;
        const normName = normalize(d.name);

        if (productCodes.has(normName)) {
            const code = productCodes.get(normName);
            if (d.code !== code || d.id_vr !== code) {
                await updateDoc(p.ref, { code: code, id_vr: code });
                matchCountP++;
                console.log(`  [Product ✅] Matched: "${d.name}" -> ${code}`);
            }
        }
    }

    console.log(`\n🎉 Finalizado! Atualizados: ${matchCountR} em Recipe, ${matchCountP} em Product.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
