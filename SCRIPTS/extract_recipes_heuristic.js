
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

// Initialize Firebase
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const FILE_PATH = 'c:/APP COZINHA/PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx';

async function extract() {
    console.log('--- Scanning Excel for Recipes ---');
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const candidates = new Map(); // Code -> Name

    rows.forEach((row, rowIndex) => {
        // Scan row for Code -> Name pairs
        for (let i = 0; i < row.length - 1; i++) {
            const potentialCode = row[i];
            const potentialName = row[i + 1];

            if (isValidCode(potentialCode) && isValidName(potentialName)) {
                const codeStr = String(potentialCode).trim();
                // Filter duplicates locally
                if (!candidates.has(codeStr)) {
                    candidates.set(codeStr, potentialName.trim());
                }
            }
        }
    });

    console.log(`Found ${candidates.size} potential recipes locally.`);

    if (candidates.size === 0) return;

    // Check against DB
    console.log('--- Checking against Database ---');
    const existingCodes = new Set();

    const allRecipesSnapshot = await db.collection('Recipe').select('code').get();
    allRecipesSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.code) existingCodes.add(String(d.code));
    });

    const newRecipes = [];
    candidates.forEach((name, code) => {
        if (!existingCodes.has(code)) {
            newRecipes.push({ code, name });
        }
    });

    console.log(`\nFound ${newRecipes.length} NEW unique recipes (not in DB):`);
    newRecipes.forEach(r => console.log(`[NEW] ${r.code} - ${r.name}`));
}

function isValidCode(val) {
    if (!val) return false;
    const str = String(val).trim();
    // Codes seem to be 3-7 digits.
    return /^\d{3,7}$/.test(str);
}

function isValidName(val) {
    if (!val || typeof val !== 'string') return false;
    const str = val.trim();
    // Must contain letters, reasonable length > 3
    if (str.length < 4) return false;
    // Should have at least one letter
    return /[a-zA-Z]/.test(str);
}

extract();
