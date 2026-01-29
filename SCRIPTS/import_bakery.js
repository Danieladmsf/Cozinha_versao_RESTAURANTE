
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importBakery() {
    const jsonPath = path.resolve('bakery_to_import.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ JSON file not found:", jsonPath);
        process.exit(1);
    }

    const recipesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📂 Loaded ${recipesData.length} bakery recipes from JSON.`);

    // Map subcategories to "PADARIA E INDUSTRIALIZADOS > Subcategory"
    // Assuming the user wants them directly under the root "PADARIA E INDUSTRIALIZADOS" (which is recipes_-_base type)
    // AND ALSO that the CategoryTree already exists for these subcategories? 
    // If not, we might need to create them or just use the string.
    // The system uses 'category' string field for display, but hierarchy relies on CategoryTree.
    // However, for just importing items, setting the category string usually works if the tree node matches.
    // The previous step flattened the hierarchy so "PAES PRODUCAO" is a direct child of "PADARIA...".

    // We will use just the subcategory name as the category string, assuming unique names, 
    // OR we might need to be specific if UI requires full path?
    // Based on "Marmita 3 DV", it seems leaf name is enough.

    try {
        console.log(`\n🚀 Importing bakery recipes...`);
        let importedCount = 0;

        for (const item of recipesData) {

            // Check if recipe exists by code to avoid duplicates or update?
            // User instruction: "IMPORTE ESTE". Usually implies create.
            // We will creating new ones. If needed we can delete old ones with exact same names, but maybe risky.
            // Let's just create.

            const recipePayload = {
                name: item.name, // Format: CODE - NAME
                name_complement: item.original_name,
                category: item.category, // e.g., "PAES PRODUCAO"
                active: true,
                type: 'receitas_-_base', // Correct system constant
                external_code: item.code,
                product_code: item.code,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                preparations: [
                    {
                        title: "Montagem Simples",
                        ingredients: [],
                        instructions: "Importado via Planilha Padaria"
                    }
                ],
                metrics: {
                    totalCost: 0,
                    costPerServing: 0,
                    recommendedSellingPrice: 0
                }
            };

            await addDoc(collection(db, "Recipe"), recipePayload);
            importedCount++;
            if (importedCount % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n✅ Successfully imported ${importedCount} recipes!`);

    } catch (error) {
        console.error("❌ Error during import:", error);
    } finally {
        process.exit(0);
    }
}

importBakery();
