import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function fixAllYields() {
    const collections = ['Recipe', 'Product'];
    let updatedCount = 0;

    for (const coll of collections) {
        console.log('--- Fetching ' + coll + ' ---');
        const qs = await getDocs(collection(db, coll));
        const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const data of allDocs) {
            if (!data.preparations || !Array.isArray(data.preparations)) continue;

            const oldYield = parseFloat(data.yield_weight) || 0;

            // Recalculate metrics
            const metrics = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);
            const newYield = parseFloat(metrics.yield_weight) || 0;

            // se diff maior que 1g
            const diff = Math.abs(oldYield - newYield);
            if (diff > 0.001 || !data.yield_weight && newYield > 0) {
                console.log(`Fixing Yield for [${data.name}]: ${oldYield.toFixed(3)}kg -> ${newYield.toFixed(3)}kg`);
                try {
                    await updateDoc(doc(db, coll, data.id), {
                        yield_weight: newYield,
                        total_weight: metrics.total_weight || 0,
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
    console.log('Finished. Fixed ' + updatedCount + ' yield weights.');
}
fixAllYields().then(() => process.exit(0)).catch(console.error);
