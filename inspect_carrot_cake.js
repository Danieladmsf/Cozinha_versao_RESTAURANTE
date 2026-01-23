
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function inspectCarrotCake() {
    console.log("🥕 Inspecting 'Bolo de Cenoura com Chocolate'...");

    try {
        const q = query(collection(db, "Recipe"), where("name", "==", "Bolo de Cenoura com Chocolate"));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("❌ Recipe not found.");
            process.exit(0);
        }

        const recipe = snap.docs[0].data();
        console.log(`\n🍰 Recipe: ${recipe.name}`);
        console.log(`Type: ${recipe.type}`);
        console.log(`Category: ${recipe.category}`);

        if (recipe.preparations) {
            recipe.preparations.forEach((prep, idx) => {
                console.log(`\n🍳 Preparation ${idx + 1}: ${prep.title}`);
                console.log(`processes: ${JSON.stringify(prep.processes)}`);

                console.table(prep.ingredients.map(ing => ({
                    Name: ing.name,
                    'Raw (kg)': ing.weight_raw,
                    'Clean (kg)': ing.weight_clean,
                    'Cooked (kg)': ing.weight_cooked,
                    'Yield %': ((parseFloat(ing.weight_cooked) / parseFloat(ing.weight_raw)) * 100).toFixed(1) + '%'
                })));

                if (prep.assembly_config) {
                    console.log("Assembly:", JSON.stringify(prep.assembly_config));
                }
            });
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

inspectCarrotCake();
