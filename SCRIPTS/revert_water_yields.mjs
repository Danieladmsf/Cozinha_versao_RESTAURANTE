import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function revertWaterYields() {
    const qs = await getDocs(collection(db, 'Recipe'));
    const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

    let updatedCount = 0;

    for (const data of allDocs) {
        let needsUpdate = false;
        if (!data.preparations) continue;

        data.preparations.forEach(p => {
            if (!p.ingredients) return;

            const waterIndex = p.ingredients.findIndex(i => i.name.toLowerCase() === 'água' || i.name.toLowerCase() === 'agua');
            if (waterIndex === -1) return;

            const waterIng = p.ingredients[waterIndex];

            // Only reverse those we marked as 0.001
            if (waterIng.weight_cooked === '0.001') {
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
                    if (data.name === 'Arroz Branco' && mainIng.name === 'Arroz Tipo 1') {
                        mainIng.weight_cooked = '7.500';
                        console.log('Fixed Arroz Branco 12.825 -> 7.500');
                    } else {
                        const pre = parseFloat(mainIng.weight_pre_cooking) || parseFloat(mainIng.weight_raw) || 0;
                        if (pre > 0) {
                            const nameLc = mainIng.name.toLowerCase();
                            let multiplier = 1;

                            if (nameLc.includes('arroz') || nameLc.includes('feijão') || nameLc.includes('feijao') || nameLc.includes('macarr')) {
                                multiplier = 2.5; // Absorbs water
                            } else if (nameLc.includes('carne')) {
                                multiplier = 0.75; // Loses water
                            }

                            mainIng.weight_cooked = (pre * multiplier).toFixed(3);
                            console.log(`Reverted ${data.name} -> ${mainIng.name} to ${mainIng.weight_cooked}`);
                        }
                    }
                    needsUpdate = true;
                }
            }
        });

        if (needsUpdate) {
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

    console.log('Finished. Reverted water yields in ' + updatedCount + ' recipes.');
}
revertWaterYields().then(() => process.exit(0)).catch(console.error);
