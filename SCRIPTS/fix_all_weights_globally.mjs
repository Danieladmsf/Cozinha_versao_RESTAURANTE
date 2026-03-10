import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function fixAllWeights() {
    const collections = ['Recipe', 'Product'];
    let updatedCount = 0;

    for (const coll of collections) {
        console.log('--- Fetching ' + coll + ' ---');
        const qs = await getDocs(collection(db, coll));
        const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const data of allDocs) {
            if (!data.preparations || !Array.isArray(data.preparations)) continue;

            const oldTotal = parseFloat(data.total_weight) || 0;
            const oldYield = parseFloat(data.yield_weight) || 0;

            // Recalculate metrics using the newly fixed engine
            const metrics = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);
            const newTotal = parseFloat(metrics.total_weight) || 0;
            const newYield = parseFloat(metrics.yield_weight) || 0;

            // If the difference is relevant (>1g)
            const diffTotal = Math.abs(oldTotal - newTotal);
            const diffYield = Math.abs(oldYield - newYield);

            if (diffTotal > 0.001 || diffYield > 0.001) {
                console.log(`Fixing [${data.name}] -> Total: ${oldTotal.toFixed(3)} to ${newTotal.toFixed(3)} | Yield: ${oldYield.toFixed(3)} to ${newYield.toFixed(3)}`);
                try {
                    await updateDoc(doc(db, coll, data.id), {
                        total_weight: newTotal,
                        yield_weight: newYield,
                        portion_weight_calculated: metrics.cuba_weight || 0,
                        total_cost: metrics.total_cost || 0,
                    });
                    updatedCount++;
                } catch (e) {
                    console.error('Failed to update ' + data.name, e);
                }
            }
        }
    }
    console.log('Finished. Fixed ' + updatedCount + ' weights globally.');
}
fixAllWeights().then(() => process.exit(0)).catch(console.error);
