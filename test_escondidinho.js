import { db } from './lib/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function testEscondidinho() {
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipes = [];
    snap.forEach(d => recipes.push({ id: d.id, ...d.data() }));

    const matriz = recipes.find(r => r.name === 'Escondidinho de Carne Seca' && r.type === 'receitas');
    if (!matriz) { console.log('Matriz not found'); return; }

    const oldName = matriz.name;

    // Find Target
    const targetRecipe = recipes.find(r => r.name.includes('Rotisseria Escondidinho de Carne Seca') && r.type === 'produtos');
    if (!targetRecipe) { console.log('Target not found'); return; }

    console.log('--- Matriz ---');
    console.log('ID:', matriz.id);
    console.log('--- Produto ---');
    console.log('ID:', targetRecipe.id);

    const sourceRecipeId = matriz.id;
    let updatedPreparations = targetRecipe.preparations || [];

    for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
        const prep = updatedPreparations[pIndex];
        const matchRootPrep = prep.origin_id === sourceRecipeId || prep.recipe_id === sourceRecipeId;

        console.log(`\n[DEBUG ESCONDIDINHO] Validando Etapa do Produto: '${prep.title}'`);
        console.log(`   -> prep.origin_id: ${prep.origin_id} | prep.recipe_id: ${prep.recipe_id} | sourceRecipeId (Matriz): ${sourceRecipeId}`);
        console.log(`   -> matchRootPrep result: ${matchRootPrep}`);

        let newSubComponents = prep.sub_components || [];
        if (newSubComponents.length > 0) {
            for (let sIndex = 0; sIndex < newSubComponents.length; sIndex++) {
                let sub = newSubComponents[sIndex];
                const matchDirectId = sub.id === sourceRecipeId || sub.source_id === sourceRecipeId;
                const matchByName = oldName && (sub.name === oldName || String(sub.name).trim() === String(oldName).trim());

                console.log(`\n[DEBUG ESCONDIDINHO] Validando Sub-componente: '${sub.name}' dentro da etapa '${prep.title}'`);
                console.log(`   -> sub.id: ${sub.id} | sub.source_id: ${sub.source_id} | sourceRecipeId: ${sourceRecipeId}`);
                console.log(`   -> matchDirectId: ${matchDirectId} | matchByName: ${matchByName}`);
            }
        }
    }
}

testEscondidinho().then(() => process.exit(0)).catch(console.error);
