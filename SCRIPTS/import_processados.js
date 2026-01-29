/**
 * Import Processed Products with CORRECT structure
 * - active: true (NOT status: "active")
 * - Simple category names matching the app structure
 */
import { db } from '../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    doc,
    Timestamp
} from 'firebase/firestore';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORRECT category names matching app structure
const CATEGORIES = {
    FRUTAS: "FRUTAS PROCESSADAS",
    LEGUMES: "LEGUMES PROCESSADAS",
    BEBIDAS: "BEBIDAS PROCESSADAS"
};

const EXCEL_PATH = path.join(__dirname, '..', 'ESCALA DE PRODUÇÃO PROCESSADOS.xlsx');

// Keywords for classification
const BEBIDAS_KEYWORDS = ['SUCO', 'VITAMINA', 'FRAPE', 'AGUA COCO', 'POLPA'];
const FRUTAS_KEYWORDS = ['ABACAXI', 'MAMAO', 'MANGA', 'MELANCIA', 'MELAO', 'GOIABA', 'MORANGO',
    'KIWI', 'UVA', 'TANGERINA', 'FRUTAS', 'COCO'];

function classifyProduct(name) {
    const upperName = name.toUpperCase();

    // Priority 1: Beverages (drinks)
    for (const kw of BEBIDAS_KEYWORDS) {
        if (upperName.includes(kw)) return CATEGORIES.BEBIDAS;
    }

    // Priority 2: Fruits
    for (const kw of FRUTAS_KEYWORDS) {
        if (upperName.includes(kw)) return CATEGORIES.FRUTAS;
    }

    // Priority 3: Vegetables (default for processed items)
    return CATEGORIES.LEGUMES;
}

async function deleteExistingRecipes() {
    console.log(`\n🗑️ Deleting existing recipes in PROCESSADOS categories...`);

    const recipesRef = collection(db, "Recipe");
    let totalDeleted = 0;

    // Delete from all target categories
    for (const cat of Object.values(CATEGORIES)) {
        const q = query(recipesRef, where("category", "==", cat));
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "Recipe", docSnap.id));
            totalDeleted++;
        }
    }

    // Also delete from old wrong category paths
    const wrongPaths = [
        "PROCESSADOS FLV > PROCESSADOS",
        "PROCESSADOS FLV > PROCESSADOS > FRUTAS PROCESSADAS",
        "PROCESSADOS FLV > PROCESSADOS > LEGUMES PROCESSADAS",
        "PROCESSADOS FLV > PROCESSADOS > BEBIDAS PROCESSADAS"
    ];

    for (const path of wrongPaths) {
        const q = query(recipesRef, where("category", "==", path));
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "Recipe", docSnap.id));
            totalDeleted++;
        }
    }

    console.log(`✅ Deleted ${totalDeleted} existing recipes`);
    return totalDeleted;
}

async function parseExcel() {
    console.log(`\n📊 Reading Excel file: ${EXCEL_PATH}`);

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const products = [];

    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 26) continue;

        const productName = row[22];
        const unit = row[23];
        const code = row[24];
        const price = row[25];

        if (!productName || productName === 'Produto' || typeof productName !== 'string') continue;
        if (productName.includes('NÃO ENCONTRADO')) continue;

        const match = productName.match(/^(\d+)\s*-\s*(.+)$/);
        if (match) {
            const name = match[2].trim();
            products.push({
                code: match[1],
                name: name,
                fullName: `${match[1]} - ${name}`,  // Include code in name like existing recipes
                unit: unit || 'UN/0001',
                price: typeof price === 'number' ? price : parseFloat(price) || 0,
                category: classifyProduct(name)
            });
        }
    }

    console.log(`✅ Found ${products.length} products to import`);
    return products;
}

async function importProducts(products) {
    console.log(`\n📥 Importing ${products.length} products...`);

    const stats = { FRUTAS: 0, LEGUMES: 0, BEBIDAS: 0, failed: 0 };

    for (const product of products) {
        try {
            const recipeData = {
                name: product.fullName,  // e.g. "005371 - ABACAXI PICADO KG"
                code: product.code,
                category: product.category,
                yield_type: "unit",
                active: true,  // CORRECT: use active: true, NOT status
                selling_price: product.price,
                preparations: [
                    {
                        title: "Preparo Padrão",
                        processes: ['cleaning'],
                        ingredients: [],
                        instructions: `Produto processado: ${product.name}`,
                        assembly_config: {
                            container_type: 'pote',
                            total_weight: '1',
                            units_quantity: '1'
                        }
                    }
                ],
                unit: product.unit,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await addDoc(collection(db, "Recipe"), recipeData);

            // Count by category
            if (product.category === CATEGORIES.FRUTAS) stats.FRUTAS++;
            else if (product.category === CATEGORIES.BEBIDAS) stats.BEBIDAS++;
            else stats.LEGUMES++;

            console.log(`  ✅ [${product.category}] ${product.fullName}`);

        } catch (error) {
            stats.failed++;
            console.error(`  ❌ Failed: ${product.name} - ${error.message}`);
        }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`  🍎 FRUTAS PROCESSADAS: ${stats.FRUTAS}`);
    console.log(`  🥕 LEGUMES PROCESSADAS: ${stats.LEGUMES}`);
    console.log(`  🧃 BEBIDAS PROCESSADAS: ${stats.BEBIDAS}`);
    console.log(`  ❌ Failed: ${stats.failed}`);

    return stats;
}

async function main() {
    console.log("=".repeat(60));
    console.log("   PROCESSADOS FLV - CORRECTED Import");
    console.log("=".repeat(60));

    try {
        await deleteExistingRecipes();
        const products = await parseExcel();

        if (products.length === 0) {
            console.log("⚠️ No products found to import");
            process.exit(0);
        }

        await importProducts(products);

        console.log("\n✅ Import completed successfully!");
        setTimeout(() => process.exit(0), 1500);

    } catch (error) {
        console.error("\n❌ Fatal error:", error);
        process.exit(1);
    }
}

main();
