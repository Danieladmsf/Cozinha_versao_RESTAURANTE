
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function inspectAllCakes() {
    console.log("🕵️‍♀️ Inspecting ALL 4 Cake Recipes...");

    const cakeNames = [
        "Bolo de Chocolate Tradicional",
        "Bolo de Cenoura com Chocolate",
        "Bolo de Fubá Cremoso",
        "Bolo de Laranja Molhadinho"
    ];

    try {
        for (const name of cakeNames) {
            const q = query(collection(db, "Recipe"), where("name", "==", name));
            const snap = await getDocs(q);

            if (snap.empty) {
                console.log(`\n❌ Recipe not found: ${name}`);
                continue;
            }

            const recipe = snap.docs[0].data();
            console.log(`\n🍰 ${recipe.name.toUpperCase()}`);

            if (recipe.preparations) {
                recipe.preparations.forEach((prep, idx) => {

                    const ingredientsList = prep.ingredients.map(ing => ({
                        Name: ing.name,
                        'Raw (kg)': ing.weight_raw,
                        'Cooked (kg)': ing.weight_cooked
                    }));

                    if (ingredientsList.length === 0) {
                        console.log("   ⚠️ No ingredients found.");
                    } else {
                        console.table(ingredientsList);
                    }
                });
            } else {
                console.log("   ⚠️ No 'preparations' field.");
            }
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

inspectAllCakes();
