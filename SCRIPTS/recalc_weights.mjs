import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function fixAll() {
    const collections = ['Recipe', 'Product'];
    let updatedCount = 0;

    for (const coll of collections) {
        console.log('Fetching ' + coll);
        const qs = await getDocs(collection(db, coll));
        const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const data of allDocs) {
            if (!data.preparations || !Array.isArray(data.preparations)) continue;

            const oldWeight = data.portion_weight_calculated || 0;
            // Recalculate metrics
            const metrics = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);
            const newWeight = metrics.cuba_weight || 0;

            // If diff is greater than 1 gram
            const diff = Math.abs(oldWeight - newWeight);
            if (diff > 0.001) {
                console.log(`Updating ${data.name}: ${oldWeight.toFixed(3)} -> ${newWeight.toFixed(3)}kg`);
                try {
                    await updateDoc(doc(db, coll, data.id), {
                        portion_weight_calculated: newWeight,
                        total_weight: metrics.total_weight || 0,
                        yield_weight: metrics.yield_weight || 0,
                        cuba_weight: newWeight,
                        total_cost: metrics.total_cost || 0,
                    });
                    updatedCount++;
                } catch (e) {
                    console.error('Failed to update ' + data.name, e);
                }
            }
        }
    }
    console.log('Finished. Updated ' + updatedCount + ' items.');
}
fixAll().then(() => process.exit(0)).catch(console.error);
