import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

function scaleIngredients(ingredients, factor) {
    return ingredients.map(ing => {
        if (ing.is_note_row) return ing;
        const res = { ...ing };
        const fields = ['quantity', 'weight_frozen', 'weight_thawed', 'weight_raw', 'weight_clean', 'weight_pre_cooking', 'weight_cooked', 'weight_portioned'];
        fields.forEach(f => {
            if (res[f] !== undefined && res[f] !== '') {
                const val = parseFloat(res[f].toString().replace(',', '.'));
                if (!isNaN(val)) res[f] = (val * factor).toFixed(5).replace('.', ',');
            }
        });
        return res;
    });
}

async function fixAllDiscrepancies() {
    console.log('Fetching all recipes...');
    const allDocsSnap = await getDocs(collection(db, 'Recipe'));

    // Build base recipes dictionary by name with their saved yield_weight
    const baseRecipesByName = new Map();
    for (const document of allDocsSnap.docs) {
        const data = document.data();
        if (data.type === 'receitas' && data.name) {
            const y = parseFloat(data.yield_weight?.toString().replace(',', '.') || '0');
            baseRecipesByName.set(data.name.toLowerCase().trim(), { id: document.id, title: data.name, ...data, yieldWeightCalc: y });
        }
    }

    let updatedProducts = 0;

    for (const document of allDocsSnap.docs) {
        const recipe = document.data();
        if (recipe.type !== 'produtos') continue;

        let changed = false;
        let mPreps = recipe.preparations ? [...recipe.preparations] : [];

        const assemblyPrep = mPreps.find(p => p.sub_components && p.sub_components.length > 0 && p.title && p.title.toLowerCase().includes('porcionamento'));
        if (!assemblyPrep) continue;

        for (const sc of assemblyPrep.sub_components) {
            if (sc.isPackaging) continue;

            const targetWeight = parseFloat(sc.assembly_weight_kg?.toString().replace(',', '.') || sc.input_yield_weight?.toString().replace(',', '.') || '0');
            if (targetWeight <= 0) continue;

            const targetPrepIndex = mPreps.findIndex(p => p.id === sc.source_id);
            if (targetPrepIndex === -1) continue;
            const targetPrep = mPreps[targetPrepIndex];

            // Skip "Montagem" steps that have no ingredients (different pattern)
            if (!targetPrep.ingredients || targetPrep.ingredients.filter(i => !i.is_note_row).length === 0) continue;

            // Try to find the base recipe by name heuristic
            let cleanPrepTitle = (targetPrep.title || '').replace(/^\d+[ªº]\s*Etapa:\s*/i, '').trim().toLowerCase();
            let matchedBase = baseRecipesByName.get(cleanPrepTitle);

            if (!matchedBase) {
                for (const [baseName, baseData] of baseRecipesByName.entries()) {
                    if (cleanPrepTitle.includes(baseName) || baseName.includes(cleanPrepTitle)) {
                        matchedBase = baseData;
                        break;
                    }
                }
            }

            if (matchedBase && matchedBase.yieldWeightCalc > 0) {
                const factor = targetWeight / matchedBase.yieldWeightCalc;

                // Flatten all base ingredients
                const baseIngredientsFull = [];
                (matchedBase.preparations || []).forEach(bp => {
                    (bp.ingredients || []).forEach(bing => baseIngredientsFull.push(bing));
                });

                if (baseIngredientsFull.length > 0) {
                    let localChanged = false;
                    targetPrep.ingredients = targetPrep.ingredients.map(mIng => {
                        if (mIng.is_note_row) return mIng;

                        const bIng = baseIngredientsFull.find(b => b.name === mIng.name);
                        if (bIng) {
                            const scaled = scaleIngredients([bIng], factor)[0];
                            const fields = ['quantity', 'weight_frozen', 'weight_thawed', 'weight_raw', 'weight_clean', 'weight_pre_cooking', 'weight_cooked', 'weight_portioned'];
                            let wChanged = false;
                            fields.forEach(f => {
                                const oldW = parseFloat(mIng[f]?.toString().replace(',', '.') || '0');
                                const newW = parseFloat(scaled[f]?.toString().replace(',', '.') || '0');
                                if (Math.abs(oldW - newW) > 0.0005) {
                                    mIng[f] = scaled[f];
                                    wChanged = true;
                                }
                            });
                            if (wChanged) localChanged = true;
                        }
                        return mIng;
                    });
                    if (localChanged) changed = true;
                }
            }
        }

        if (changed) {
            await updateDoc(doc(db, 'Recipe', document.id), { preparations: mPreps });
            updatedProducts++;
            console.log('--- FIXED:', recipe.name);
        }
    }

    console.log('\nTotal Products fixed:', updatedProducts);
    process.exit(0);
}

setTimeout(() => {
    console.log('TIMEOUT: Force exiting.');
    process.exit(1);
}, 30000);

fixAllDiscrepancies();
