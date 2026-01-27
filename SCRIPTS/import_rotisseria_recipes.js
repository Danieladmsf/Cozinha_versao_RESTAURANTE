
import { db } from '../lib/firebase.js'; // Adjust path if needed, assuming running from root
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    serverTimestamp,
    doc,
    setDoc
} from 'firebase/firestore';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find or create category
async function findOrCreateCategory(name, parentId = null, level = 0) {
    const categoriesRef = collection(db, 'Category');
    let q;

    if (parentId) {
        q = query(
            categoriesRef,
            where('name', '==', name),
            where('parent_id', '==', parentId),
            where('active', '==', true)
        );
    } else {
        q = query(
            categoriesRef,
            where('name', '==', name),
            where('level', '==', level),
            where('active', '==', true)
        );
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const catDoc = snapshot.docs[0];
        console.log(`✅ Found Category: ${name} (ID: ${catDoc.id})`);

        // Ensure type is set if missing
        if (!catDoc.data().type) {
            await setDoc(doc(db, 'Category', catDoc.id), { type: 'receitas' }, { merge: true });
            console.log(`   Updated type to 'receitas'`);
        }

        return catDoc.id;
    }

    // Create if not exists
    console.log(`➕ Creating Category: ${name}...`);
    const newCatData = {
        name: name,
        label: name,
        active: true,
        level: level,
        parent_id: parentId,
        type: 'receitas', // Important for filtering
        created_at: serverTimestamp()
    };

    const docRef = await addDoc(categoriesRef, newCatData);
    console.log(`✅ Created Category: ${name} (ID: ${docRef.id})`);
    return docRef.id;
}

async function importRotisseriaRecipes() {
    console.log("🚀 Starting Rotisseria Import...");

    const filePath = path.join(__dirname, '..', 'ESCALA DE PRODUÇÃO ROTISSERIA.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File NOT FOUND at ${filePath}`);
        process.exit(1);
    }

    // 1. Setup Categories
    // Structure: Produtos > rotisseria > PRODUCAO - ROTISSERIA
    try {
        const produtosId = await findOrCreateCategory('Produtos', null, 0);
        const rotisseriaId = await findOrCreateCategory('rotisseria', produtosId, 1);
        const producaoId = await findOrCreateCategory('PRODUCAO - ROTISSERIA', rotisseriaId, 2);

        console.log(`📂 Target Category ID: ${producaoId}`);

        // 2. Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`📊 Found ${data.length} rows in Excel.`);

        let successCount = 0;
        // CORRECTED COLLECTION: 'Recipe' not 'recipes'
        const recipesRef = collection(db, 'Recipe');

        for (const row of data) {
            const produtoRaw = row['Produto']; // e.g., "002028 - ERVILHA CONGELADA KG"

            if (!produtoRaw) continue;

            // Extract logic
            const parts = produtoRaw.split(' - ');
            const code = parts[0] ? parts[0].trim() : '';
            const namePart = parts.length > 1 ? parts.slice(1).join(' - ').trim() : produtoRaw;

            // Format: "Code - Name"
            const finalName = `${code} - ${namePart}`;

            // Unit Type Inference
            let unitType = 'UN';
            const lowerName = finalName.toLowerCase();
            const lowerPkg = (row['Embalagem'] || '').toString().toLowerCase();

            if (lowerName.includes('kg') || lowerPkg.includes('kg')) {
                unitType = 'KG';
            } else if (lowerName.includes('lt') || lowerName.includes('litro')) {
                unitType = 'LT';
            }

            // Check if recipe already exists
            const qRecipe = query(recipesRef, where('name', '==', finalName));
            const existingRecipe = await getDocs(qRecipe);

            if (!existingRecipe.empty) {
                console.log(`⚠️ Recipe already exists: ${finalName}`);
                continue;
            }

            const newRecipe = {
                name: finalName,
                search_name: finalName.toLowerCase(),
                category_id: producaoId,
                category: 'PRODUCAO - ROTISSERIA', // REQUIRED STRING NAME
                type: 'receitas', // REQUIRED TYPE
                unit_type: unitType,
                active: true,
                created_at: serverTimestamp(),
                external_code: code
            };

            await addDoc(recipesRef, newRecipe);
            console.log(`✅ Imported: ${finalName}`);
            successCount++;
        }

        console.log(`🎉 Import Complete! Imported ${successCount} recipes to 'Recipe'.`);
        setTimeout(() => process.exit(0), 2000);

    } catch (error) {
        console.error("❌ Error during import:", error);
        process.exit(1);
    }
}

importRotisseriaRecipes();
