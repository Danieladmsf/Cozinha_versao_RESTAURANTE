import { db } from '../lib/firebase.js';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function recalculateAllMetrics() {
    console.log('[Recalculator] Starting global metrics refresh...');

    // Fetch all recipes to provide cross-recipe context
    const qs = await getDocs(collection(db, 'Recipe'));
    const allRecipes = qs.docs.map(d => ({ id: d.id, ...d.data() }));

    let updatedCount = 0;

    for (const recipeRef of qs.docs) {
        const recipeDoc = recipeRef.data();

        try {
            // Use the newly fixed RecipeEngine to recalculate everything perfectly
            const metrics = RecipeEngine.calculateRecipeMetrics(
                recipeDoc,
                recipeDoc.preparations || [],
                allRecipes
            );

            // We only need to update the root-level snapshot fields so that table views and 
            // reference queries (like the demand calculator) see the correct numbers without
            // opening the UI. We do NOT need to modify the internal ingredients array, 
            // since the UI calculates them fresh on load.

            const updates = {
                yield_weight: metrics.yield_weight || 0,
                total_weight: metrics.total_weight || 0,
                total_cost: metrics.total_cost || 0,
                cuba_weight: metrics.cuba_weight || 0,
                portion_weight_calculated: metrics.portion_weight_calculated || 0
            };

            await updateDoc(doc(db, 'Recipe', recipeRef.id), updates);
            updatedCount++;

            process.stdout.write(`\r[Recalculator] Recalculated ${updatedCount} recipes...`);

        } catch (error) {
            console.log(`\n[Recalculator] Error processing recipe ${recipeDoc.name}:`, error.message);
        }
    }

    console.log(`\n[Recalculator] Successfully recalculated global metrics for ${updatedCount} recipes.`);
}

recalculateAllMetrics().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
