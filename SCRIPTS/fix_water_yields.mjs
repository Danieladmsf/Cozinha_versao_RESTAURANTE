import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function fixWaterYields() {
    const qs = await getDocs(collection(db, 'Recipe'));
    const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

    let updatedCount = 0;

    for (const data of allDocs) {
        let needsUpdate = false;

        // Only look at root preparations holding ingredients
        if (!data.preparations) continue;

        data.preparations.forEach(p => {
            if (!p.ingredients) return;

            // Find Water
            const waterIndex = p.ingredients.findIndex(i => i.name.toLowerCase() === 'água' || i.name.toLowerCase() === 'agua');
            if (waterIndex === -1) return;

            const waterIng = p.ingredients[waterIndex];
            const cookedWater = parseFloat(waterIng.weight_cooked);
            if (cookedWater > 0.05) { // If water is holding weight > 50g

                // Find the primary carbohydrate or protein to absorb the weight
                const mainIng = p.ingredients.find(i =>
                    i.name.toLowerCase().includes('arroz') ||
                    i.name.toLowerCase().includes('feijão') ||
                    i.name.toLowerCase().includes('feijao') ||
                    i.name.toLowerCase().includes('macarrão') ||
                    i.name.toLowerCase().includes('macarrao') ||
                    i.name.toLowerCase().includes('lentilha') ||
                    i.name.toLowerCase().includes('grão') ||
                    i.name.toLowerCase().includes('carne')
                );

                if (mainIng) {
                    console.log(`[${data.name}] Moving ${cookedWater}kg yield from Water to ${mainIng.name}`);

                    const mainCookedNow = parseFloat(mainIng.weight_cooked) || parseFloat(mainIng.weight_pre_cooking) || 0;
                    // Add the water's fake yield to the main ingredient
                    mainIng.weight_cooked = (mainCookedNow + cookedWater).toFixed(3);

                    // Set water to evaporate (0.001 to bypass fallback)
                    waterIng.weight_cooked = '0.001';
                    needsUpdate = true;
                }
            }
        });

        if (needsUpdate) {
            // Recalculate metrics
            const metrics = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);

            await updateDoc(doc(db, 'Recipe', data.id), {
                preparations: data.preparations,
                yield_weight: metrics.yield_weight,
                total_weight: metrics.total_weight,
                portion_weight_calculated: metrics.cuba_weight || 0
            });
            updatedCount++;
        }
    }

    console.log('Finished. Fixed water yield in ' + updatedCount + ' recipes.');
}
fixWaterYields().then(() => process.exit(0)).catch(console.error);
