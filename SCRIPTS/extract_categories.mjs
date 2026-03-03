import xlsx from 'xlsx';
import fs from 'fs';

const filePath = "C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\public\\Planilha sem título (2).xlsx";
const workbook = xlsx.readFile(filePath);

const pesosSheet = workbook.Sheets["PESOS"];
const pesosData = xlsx.utils.sheet_to_json(pesosSheet, { header: 1, defval: "" });

const blocks = [
    { cat: 0, cod: 1, nome: 2, peso: 3 },
    { cat: 5, cod: 6, nome: 7, peso: 8 },
    { cat: 10, cod: 11, nome: 12, peso: 13 },
    { cat: 15, cod: 16, nome: 17, peso: 18 },
    { cat: 20, cod: 21, nome: 22, peso: 23 },
    { cat: 25, cod: 26, nome: 27, peso: 28 },
    { cat: 30, cod: 31, nome: 32, peso: 33 }
];

const categories = {};

// Start from row 2 (index 2)
for (let i = 2; i < pesosData.length; i++) {
    const row = pesosData[i];
    if (!row) continue;

    for (const block of blocks) {
        const catVal = String(row[block.cat] || "").trim();
        const codVal = String(row[block.cod] || "").trim();
        const nomeVal = String(row[block.nome] || "").trim();
        const pesoVal = String(row[block.peso] || "").trim();

        // Update current category for this block if present
        if (catVal && catVal !== "ALMOÇO" && catVal !== "JANTAR") {
            block.currentCategory = catVal.toUpperCase();
        }

        if (block.currentCategory && codVal && codVal !== "0" && codVal !== "#REF!" && codVal !== "COD") {
            if (nomeVal !== "NÃO ENCONTRADO" && nomeVal !== "PRODUTO" && nomeVal !== "") {
                if (!categories[block.currentCategory]) {
                    categories[block.currentCategory] = new Map();
                }
                // Use code as key to deduplicate
                categories[block.currentCategory].set(codVal, {
                    cod: codVal,
                    nome: nomeVal,
                    peso: pesoVal
                });
            }
        }
    }
}

let output = "";

for (const [cat, itemsMap] of Object.entries(categories)) {
    output += `${cat}\n\n`;
    const items = Array.from(itemsMap.values());
    for (const item of items) {
        output += `${item.cod}\t${item.nome}\t${item.peso}\n`;
    }
    output += "\n";
}

fs.writeFileSync("C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\categorias_consolidadas.txt", output, "utf8");
console.log("Extraction complete. Found categories:", Object.keys(categories).join(", "));
