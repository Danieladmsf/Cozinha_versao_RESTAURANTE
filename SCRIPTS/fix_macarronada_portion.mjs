import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function updateMacarronada() {
    const q = query(collection(db, 'Recipe'), where('name', '==', 'Macarronada à Bolonhesa'));
    const qs = await getDocs(q);
    if (qs.empty) { console.log('Recipe not found'); return; }

    const recipeDoc = qs.docs[0];
    const data = recipeDoc.data();

    // They want Macarrão cozido = 258g, cru = 129g
    // Água, Óleo, Sal etc can be scaled proportionately
    const oldPastaRaw = 2.5; // Kg
    const newPastaRaw = 0.129; // Kg
    const pastaMultiplier = newPastaRaw / oldPastaRaw;

    // They want Molho to yield 92.88g
    // We need to find the old yield of the Molho to scale it
    let oldMolhoYield = 0;
    data.preparations[1].ingredients.forEach(i => {
        const cooked = parseFloat(i.weight_cooked) || parseFloat(i.weight_pre_cooking);
        oldMolhoYield += cooked;
    });

    const newMolhoYield = 0.09288;
    const molhoMultiplier = newMolhoYield / oldMolhoYield;

    // Etapa 1
    data.preparations[0].ingredients.forEach(i => {
        const q = parseFloat(i.quantity) || 0;
        const r = parseFloat(i.weight_raw) || 0;
        const c = parseFloat(i.weight_clean) || 0;
        const p = parseFloat(i.weight_pre_cooking) || 0;
        const ck = parseFloat(i.weight_cooked) || 0;

        if (q > 0) i.quantity = (q * pastaMultiplier).toFixed(4);
        if (r > 0) i.weight_raw = (r * pastaMultiplier).toFixed(4);
        if (c > 0) i.weight_clean = (c * pastaMultiplier).toFixed(4);
        if (p > 0) i.weight_pre_cooking = (p * pastaMultiplier).toFixed(4);
        if (ck > 0) i.weight_cooked = (ck * pastaMultiplier).toFixed(4);

        // Override explicitly for the required pasta logic
        if (i.name.includes('Macarrão')) {
            i.weight_pre_cooking = '0.129';
            i.weight_cooked = '0.258';
            i.quantity = '0.129';
        }
    });

    // Etapa 2
    data.preparations[1].ingredients.forEach(i => {
        const q = parseFloat(i.quantity) || 0;
        const r = parseFloat(i.weight_raw) || 0;
        const c = parseFloat(i.weight_clean) || 0;
        const p = parseFloat(i.weight_pre_cooking) || 0;
        const ck = parseFloat(i.weight_cooked) || 0;

        if (q > 0) i.quantity = (q * molhoMultiplier).toFixed(4);
        if (r > 0) i.weight_raw = (r * molhoMultiplier).toFixed(4);
        if (c > 0) i.weight_clean = (c * molhoMultiplier).toFixed(4);
        if (p > 0) i.weight_pre_cooking = (p * molhoMultiplier).toFixed(4);

        // Since some ingredients evaporate or yield differently, we apply multiplier to cooked as well
        if (ck > 0) {
            // Keep identical yield proportion for each internal ingredient
            i.weight_cooked = (ck * molhoMultiplier).toFixed(4);
        }
    });

    // Inject Etapa 3 (Porcionamento) which was present in user screenshot but not saved
    if (data.preparations.length === 2) {
        data.preparations.push({
            title: "3ª Etapa: Porcionamento",
            processes: ["portioning"],
            yield_quantity: "1",
            ingredients: [],
            recipes: [],
            sub_components: [
                {
                    name: "1ª Etapa: Cocção do Macarrão",
                    type: "preparation",
                    origin_id: "prep_0", // Etapa index
                    weight_portioned: "0.258",
                    input_yield_weight: "0.258"
                },
                {
                    name: "2ª Etapa: Molho Bolonhesa",
                    type: "preparation",
                    origin_id: "prep_1",
                    weight_portioned: "0.093",
                    input_yield_weight: "0.093"
                }
            ]
        });
    } else if (data.preparations.length === 3) {
        // Just update it if it somehow exists
        const p3 = data.preparations[2];
        p3.yield_quantity = "1";
        if (p3.sub_components && p3.sub_components.length === 2) {
            p3.sub_components[0].weight_portioned = "0.258";
            p3.sub_components[0].input_yield_weight = "0.258";
            p3.sub_components[1].weight_portioned = "0.093";
            p3.sub_components[1].input_yield_weight = "0.093";
        }
    }

    // Recalculate global metrics
    const qsAll = await getDocs(collection(db, 'Recipe'));
    const allDocs = qsAll.docs.map(d => ({ id: d.id, ...d.data() }));

    const m = RecipeEngine.calculateRecipeMetrics(data, data.preparations, allDocs);

    await updateDoc(doc(db, 'Recipe', recipeDoc.id), {
        preparations: data.preparations,
        cuba_weight: m.totalYieldWeight || 0.351,
        yield_weight: m.yield_weight || 0.351,
        total_weight: m.total_weight || 0.351,
        portion_weight_calculated: m.cuba_weight || 0,
        total_cost: m.total_cost || 0
    });

    console.log('Macarronada updated! New Total Yield:', m.yield_weight, 'Total Cost:', m.total_cost, 'Total Raw Weight:', m.total_weight);
}
updateMacarronada().then(() => process.exit(0)).catch(console.error);
