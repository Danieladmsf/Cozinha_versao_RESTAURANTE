
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    getDoc
} from 'firebase/firestore';

async function fixCakeCosts() {
    console.log("💰 Fixing Cake Costs...");

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

            console.log(`🍰 ${name}:`);

            let totalCost = 0;

            if (recipe.preparations) {
                for (const prep of recipe.preparations) {
                    if (prep.ingredients) {
                        for (const ing of prep.ingredients) {
                            // We need to calculate cost based on weight_clean/weight_raw.
                            // Logic: Cost is usually Price/Unit * weight_raw (since we buy raw).
                            // We need to fetch the ingredient to get the current price? 
                            // The recipe ingredient snapshot usually has 'current_price'.

                            let price = parseFloat(ing.current_price || 0);
                            let quantity = parseFloat(ing.weight_raw || 0);

                            // Handle units (dz to kg conversion might be tricky if not normalized).
                            // Using simplistic logic assuming price matches unit.

                            // Special case: Eggs were seeded as 'dz' price ~18.00 but weight in kg?
                            // My seed script set price 36.00/kg (converted). So if unit is kg, it works.
                            // Let's assume the snapshot data in recipe.ingredients is consistent.

                            if (ing.name === "Embalagem Para Bolo") {
                                // Special handling if unit is 'un'
                                quantity = 1;
                            }

                            const itemCost = price * quantity;
                            totalCost += itemCost;
                        }
                    }
                }
            }

            const formattedCost = totalCost.toFixed(2);

            console.log(`    Calculated Total Cost: R$ ${formattedCost}`);
            console.log(`   Updating root 'cuba_cost', 'unit_cost', 'total_cost'...`);

            await updateDoc(doc(db, "Recipe", recipeDoc.id), {
                cuba_cost: formattedCost,
                unit_cost: formattedCost,
                total_cost: formattedCost,
                portion_cost: formattedCost // To be safe
            });

            console.log("   ✅ Updated.");
        }

        console.log("\n✨ All cake costs updated. Please refresh the portal.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixCakeCosts();
