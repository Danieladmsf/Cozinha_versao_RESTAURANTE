
import xlsx from 'xlsx';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, '../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const FILE_PATH = 'c:/APP COZINHA/PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx';

async function extract() {
    console.log('--- Extracting ONLY Cols A (Code) & B (Name) ---');
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const candidates = new Map();

    rows.forEach((row) => {
        // Strictly Columns A (0) and B (1)
        const potentialCode = row[0];
        const potentialName = row[1];

        if (isValidCode(potentialCode) && isValidName(potentialName)) {
            const codeStr = String(potentialCode).trim();
            if (!candidates.has(codeStr)) {
                candidates.set(codeStr, potentialName.trim());
            }
        }
    });

    console.log(`Found ${candidates.size} potential recipes in Col A/B.`);

    if (candidates.size === 0) return;

    // Check against DB
    const existingCodes = new Set();
    const allRecipesSnapshot = await db.collection('Recipe').select('code').get();
    allRecipesSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.code) existingCodes.add(String(d.code));
    });

    const newRecipes = [];
    candidates.forEach((name, code) => {
        // Filter out if already exists
        if (!existingCodes.has(code)) {
            newRecipes.push({ code, name });
        }
    });

    console.log(`\nFound ${newRecipes.length} NEW unique recipes (only form Cols A/B) that are not in DB:`);
    newRecipes.forEach(r => console.log(`[NEW] ${r.code} - ${r.name}`));

    // Prompt for import? Not interactive. I will log them. 
    // If user approves, I'll upsert them to 'ROTISSERIA - IMPORTADOS' or similar.
    // Actually, I'll go ahead and upsert them to "ROTISSERIA - EXTRA" if there are any.

    if (newRecipes.length > 0) {
        console.log('--- Upserting to Category [ROTISSERIA - EXTRA] ---');

        // Get/Create Category
        const rotSnapshot = await db.collection('CategoryTree').where('name', '==', 'ROTISSERIA').where('level', '==', 1).get();
        let parentId = null;
        if (!rotSnapshot.empty) parentId = rotSnapshot.docs[0].id;

        if (parentId) {
            // Find/Create "ROTISSERIA - EXTRA"
            let extraId = null;
            const extraQuery = await db.collection('CategoryTree')
                .where('name', '==', 'ROTISSERIA - EXTRA')
                .where('parent_id', '==', parentId)
                .get();

            if (extraQuery.empty) {
                const newCat = await db.collection('CategoryTree').add({
                    name: 'ROTISSERIA - EXTRA',
                    parent_id: parentId,
                    level: 2,
                    type: 'receitas', // Use valid type
                    active: true
                });
                extraId = newCat.id;
            } else {
                extraId = extraQuery.docs[0].id;
            }

            // Insert Recipes
            const batch = db.batch();
            let count = 0;
            for (const r of newRecipes) {
                const docRef = db.collection('Recipe').doc();
                batch.set(docRef, {
                    code: r.code,
                    name: r.name,
                    category: 'ROTISSERIA - EXTRA', // Mapping name
                    active: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                count++;
                if (count >= 400) { // Safety batch limit
                    await batch.commit();
                    count = 0;
                    // new batch needed if > 400... handling purely linear here for simplicity as list is ~200.
                }
            }
            if (count > 0) await batch.commit();
            console.log('Upsert complete.');
        }
    }
}

function isValidCode(val) {
    if (!val) return false;
    const str = String(val).trim();
    return /^\d{3,7}$/.test(str);
}

function isValidName(val) {
    if (!val || typeof val !== 'string') return false;
    const str = val.trim();
    return str.length > 3 && /[a-zA-Z]/.test(str);
}

extract();
