import { db } from '../lib/firebase.js';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function fixCleaningLosses() {
    const qs = await getDocs(collection(db, 'Recipe'));
    const allDocs = qs.docs.map(d => ({ id: d.id, ...d.data() }));

    let updatedCount = 0;

    // Fator de rendimento gastronômico médio
    const yieldFactors = {
        'alho': 0.80, // 20% perda casca
        'cebola': 0.85, // 15% perda casca/talo
        'cenoura': 0.85, // 15% casca
        'batata': 0.85, // 15% casca
        'tomate': 0.90, // 10% sementes/pedúnculo
        'abóbora': 0.70, // 30% casca/semente
        'mandioca': 0.70, // 30% casca dupla/fio
        'pimentão': 0.85 // 15% semente/talo
    };

    for (const data of allDocs) {
        let needsUpdate = false;
        if (!data.preparations) continue;

        data.preparations.forEach(p => {
            if (!p.ingredients) return;

            p.ingredients.forEach(i => {
                const nameLc = i.name.toLowerCase();

                // Se o ingrediente for conhecido pelo dicionário de perdas
                const factorKey = Object.keys(yieldFactors).find(k => nameLc.includes(k));

                if (factorKey) {
                    const hasRaw = parseFloat(i.weight_raw) > 0;
                    const hasClean = parseFloat(i.weight_clean) > 0;
                    const hasPre = parseFloat(i.weight_pre_cooking) > 0;
                    const hasCooked = parseFloat(i.weight_cooked) > 0;
                    const hasQuantity = parseFloat(i.quantity) > 0;

                    // Se a pessoa NAO preencheu peso Bruto ou Limpo
                    if (!hasRaw && !hasClean) {

                        // Usar o que ela preencheu de mais próximo como a base "Limpa"
                        let cleanWeight = 0;
                        if (hasPre) cleanWeight = parseFloat(i.weight_pre_cooking);
                        else if (hasCooked && !hasQuantity) cleanWeight = parseFloat(i.weight_cooked);
                        else if (hasQuantity) cleanWeight = parseFloat(i.quantity);

                        if (cleanWeight > 0) {
                            const factor = yieldFactors[factorKey];
                            const estimatedRaw = cleanWeight / factor;

                            // Setar o peso limpo base
                            i.weight_clean = cleanWeight.toFixed(3);

                            // Setar o novo peso sujo retroativo
                            i.weight_raw = estimatedRaw.toFixed(3);

                            if (!p.processes) p.processes = [];
                            if (!p.processes.includes('cleaning')) {
                                p.processes.push('cleaning');
                            }

                            console.log(`[${data.name}] ${i.name}: Fixed missing raw weight. Clean ${cleanWeight}kg -> Raw ${i.weight_raw}kg (${factor * 100}% yield)`);
                            needsUpdate = true;
                        }
                    }
                }
            });
        });

        if (needsUpdate) {
            const metrics = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);
            await updateDoc(doc(db, 'Recipe', data.id), {
                preparations: data.preparations,
                yield_weight: metrics.yield_weight,
                total_weight: metrics.total_weight,
                portion_weight_calculated: metrics.cuba_weight || 0,
                total_cost: metrics.total_cost || 0
            });
            updatedCount++;
        }
    }

    console.log('Finished. Applied gastronomic cleaning yield to ' + updatedCount + ' recipes.');
}
fixCleaningLosses().then(() => process.exit(0)).catch(console.error);
