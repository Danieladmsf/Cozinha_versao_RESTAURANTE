import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RecipeEngine } from '../lib/recipe-engine/RecipeEngine.js';

async function syncMacarronada() {
    const q = query(collection(db, 'Recipe'), where('name', '==', 'Macarronada à Bolonhesa'));
    const qs = await getDocs(q);
    if (qs.empty) { console.log('Recipe not found'); return; }

    const recipeDoc = qs.docs[0];
    const data = recipeDoc.data();

    const p1 = data.preparations[0];
    const p2 = data.preparations[1];

    // Calculate target factor for Stage 1 (we need 129g of raw pasta)
    let currentPastaRaw = 0;
    p1.ingredients.forEach(i => {
        if (i.name.includes('Macarrão')) currentPastaRaw = parseFloat(i.weight_pre_cooking) || 0.053;
    });
    const p1Factor = 0.129 / currentPastaRaw;

    p1.ingredients.forEach(i => {
        const q = parseFloat(i.quantity) || 0;
        const r = parseFloat(i.weight_raw) || 0;
        const c = parseFloat(i.weight_clean) || 0;
        const p = parseFloat(i.weight_pre_cooking) || 0;
        const ck = parseFloat(i.weight_cooked) || 0;

        if (q > 0) i.quantity = (q * p1Factor).toFixed(4);
        if (r > 0) i.weight_raw = (r * p1Factor).toFixed(4);
        if (c > 0) i.weight_clean = (c * p1Factor).toFixed(4);
        if (p > 0) i.weight_pre_cooking = (p * p1Factor).toFixed(4);
        if (ck > 0) i.weight_cooked = (ck * p1Factor).toFixed(4);
    });

    // Calculate target factor for Stage 2 (we need 93g of sauce cooked)
    let currentMolhoYield = 0;
    p2.ingredients.forEach(i => {
        const cooked = parseFloat(i.weight_cooked) || parseFloat(i.weight_pre_cooking);
        currentMolhoYield += cooked;
    });
    const p2Factor = 0.09288 / currentMolhoYield;

    p2.ingredients.forEach(i => {
        const q = parseFloat(i.quantity) || 0;
        const r = parseFloat(i.weight_raw) || 0;
        const c = parseFloat(i.weight_clean) || 0;
        const p = parseFloat(i.weight_pre_cooking) || 0;
        const ck = parseFloat(i.weight_cooked) || 0;

        if (q > 0) i.quantity = (q * p2Factor).toFixed(4);
        if (r > 0) i.weight_raw = (r * p2Factor).toFixed(4);
        if (c > 0) i.weight_clean = (c * p2Factor).toFixed(4);
        if (p > 0) i.weight_pre_cooking = (p * p2Factor).toFixed(4);
        if (ck > 0) i.weight_cooked = (ck * p2Factor).toFixed(4);
    });

    // Rebuild Stage 3 with the CORRECT ID references (source_id instead of origin_id)
    data.preparations[2] = {
        id: 'prep_3_porcionamento',
        title: "3ª Etapa: Porcionamento",
        processes: ["portioning"],
        yield_quantity: "1",
        ingredients: [],
        recipes: [],
        assembly_config: {
            container_type: 'cuba',
            total_weight: '',
            units_quantity: '1',
            unit_type: 'un',
            notes: ''
        },
        sub_components: [
            {
                id: 'sc_pasta_1',
                name: "1ª Etapa: Cocção do Macarrão",
                type: "preparation",
                source_id: p1.id, // This links to the local preparation correctly!
                assembly_weight_kg: "0.258",
                yield_weight: 0.258,
                total_cost: 0
            },
            {
                id: 'sc_sauce_2',
                name: "2ª Etapa: Molho Bolonhesa",
                type: "preparation",
                source_id: p2.id, // Links correctly to local preparation 2
                assembly_weight_kg: "0.093",
                yield_weight: 0.093,
                total_cost: 0
            }
        ]
    };

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

    console.log('Macarronada DB Structure fixed! Base yields align with Assembly SubComponents.');
}
syncMacarronada().then(() => process.exit(0)).catch(console.error);
