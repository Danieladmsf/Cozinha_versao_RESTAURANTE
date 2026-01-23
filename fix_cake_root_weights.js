
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc
} from 'firebase/firestore';

async function fixCakeWeights() {
    console.log("🔧 Fixing Cake Root Weights and Prices...");

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
                console.log(`❌ Recipe not found: ${name}`);
                continue;
            }

            const recipeDoc = snap.docs[0];
            const recipe = recipeDoc.data();

            let totalWeight = 0;
            let totalCost = 0; // We can't easily calc cost without ingredient lookup, but we can fix weight.
            // Actually, pricing is dynamic in portal, but weight needs to be in document for "Contém X kg".

            let mainContainer = 'assadeira';

            if (recipe.preparations) {
                recipe.preparations.forEach(prep => {
                    // Sum weights
                    if (prep.assembly_config && prep.assembly_config.total_weight) {
                        totalWeight += parseFloat(prep.assembly_config.total_weight);
                    }
                    if (prep.assembly_config && prep.assembly_config.container_type) {
                        mainContainer = prep.assembly_config.container_type;
                    }
                });
            }

            const formattedWeight = totalWeight.toFixed(3);

            console.log(`🍰 ${name}:`);
            console.log(`    Calculated Total Weight: ${formattedWeight} kg`);
            console.log(`   Updating root 'cuba_weight', 'total_weight', 'yield_weight'...`);

            await updateDoc(doc(db, "Recipe", recipeDoc.id), {
                cuba_weight: formattedWeight,  // Used by Portal for "Peso Total"
                total_weight: formattedWeight, // Used for internal calc
                yield_weight: formattedWeight, // Used for yield calc
                weight_cooked: formattedWeight,// Consistency
                unit_type: mainContainer       // Set default unit type
            });

            console.log("   ✅ Updated.");
        }

        console.log("\n✨ All cakes updated. Please refresh the portal.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixCakeWeights();
