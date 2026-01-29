
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

async function importRecipes() {
    const jsonPath = path.resolve('recipes_to_import.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ JSON file not found:", jsonPath);
        process.exit(1);
    }

    const recipesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📂 Loaded ${recipesData.length} recipes from JSON.`);

    const targetCategory = "Marmita 3 DV";
    const oldWrongCategory = "Produtos > marmitas 3 DV";

    try {
        // 1. DELETE EXISTING RECIPES
        console.log(`\n🗑️ Deleting existing recipes in '${targetCategory}' and '${oldWrongCategory}'...`);

        // Delete from target path
        const q1 = query(collection(db, "Recipe"), where("category", "==", targetCategory));
        const s1 = await getDocs(q1);
        const p1 = s1.docs.map(d => deleteDoc(doc(db, "Recipe", d.id)));

        // Delete from old wrong path
        const q2 = query(collection(db, "Recipe"), where("category", "==", oldWrongCategory));
        const s2 = await getDocs(q2);
        const p2 = s2.docs.map(d => deleteDoc(doc(db, "Recipe", d.id)));

        await Promise.all([...p1, ...p2]);
        console.log(`✅ Deleted ${s1.size + s2.size} old recipes.`);

        // 2. IMPORT NEW RECIPES
        console.log(`\n🚀 Importing new recipes...`);
        let importedCount = 0;

        for (const item of recipesData) {
            const recipePayload = {
                name: `${item.code} - ${item.name}`,
                name_complement: item.full_name_original, // Saving original name just in case
                category: targetCategory,
                active: true,
                type: 'receitas_-_base', // Correct system constant for Products
                external_code: item.code, // Storing element code
                product_code: item.code, // Redundant but consistent
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                // Basic recipe structure to prevent crashes
                preparations: [
                    {
                        title: "Montagem Simples",
                        ingredients: [], // No ingredients parsed yet, just the product
                        instructions: "Importado via Excel"
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

importRecipes();
