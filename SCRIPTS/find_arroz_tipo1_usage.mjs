import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function run() {
    // 1) Buscar TODOS os ingredientes que contenham "arroz" no nome
    console.log('====================================================');
    console.log('   TODOS OS INGREDIENTES COM "ARROZ" NO FIREBASE');
    console.log('====================================================\n');

    const ingSnap = await getDocs(collection(db, 'Ingredient'));
    const arrozIngredients = [];
    ingSnap.forEach(doc => {
        const data = doc.data();
        if ((data.name || '').toLowerCase().includes('arroz')) {
            arrozIngredients.push({ id: doc.id, ...data });
        }
    });

    console.log(`Encontrados ${arrozIngredients.length} ingrediente(s) com "arroz":\n`);
    for (const ing of arrozIngredients) {
        console.log(`  ID: ${ing.id} | Nome: "${ing.name}" | Cat: ${ing.category || 'N/A'} | Unit: ${ing.unit || 'N/A'}`);
    }

    // 2) Buscar as receitas específicas que aparecem na consolidada
    console.log('\n====================================================');
    console.log('   VERIFICANDO RECEITAS DA LISTA CONSOLIDADA');
    console.log('====================================================\n');

    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    const targetRecipes = [];
    recipeSnap.forEach(d => {
        const data = d.data();
        const name = (data.name || '').toLowerCase();
        if (name.includes('arroz branco bendito') || 
            name.includes('arroz a grega') || name.includes('arroz à grega') ||
            name.includes('arroz carreteiro')) {
            targetRecipes.push({ id: d.id, ...data });
        }
    });

    for (const recipe of targetRecipes) {
        console.log(`\n========================================`);
        console.log(`RECEITA: "${recipe.name}" (ID: ${recipe.id})`);
        console.log(`========================================`);
        
        // Check top-level ingredients
        if (recipe.ingredients?.length) {
            console.log('  [ingredients[]]');
            for (const ing of recipe.ingredients) {
                if ((ing.name || '').toLowerCase().includes('arroz')) {
                    console.log(`    - Nome: "${ing.name}"`);
                    console.log(`      ingredient_id: ${ing.ingredient_id || 'N/A'}`);
                    console.log(`      ingredientId: ${ing.ingredientId || 'N/A'}`);
                    console.log(`      id: ${ing.id || 'N/A'}`);
                    console.log(`      quantity: ${ing.quantity} | unit: ${ing.unit}`);
                    console.log(`      brut_weight: ${ing.brut_weight}`);
                }
            }
        }

        // Check preparations
        if (recipe.preparations?.length) {
            for (let pi = 0; pi < recipe.preparations.length; pi++) {
                const prep = recipe.preparations[pi];
                console.log(`  [preparations[${pi}]: "${prep.title || 'sem título'}"]`);
                for (const ing of (prep.ingredients || [])) {
                    if ((ing.name || '').toLowerCase().includes('arroz')) {
                        console.log(`    - Nome: "${ing.name}"`);
                        console.log(`      ingredient_id: ${ing.ingredient_id || 'N/A'}`);
                        console.log(`      ingredientId: ${ing.ingredientId || 'N/A'}`);
                        console.log(`      id: ${ing.id || 'N/A'}`);
                        console.log(`      quantity: ${ing.quantity} | unit: ${ing.unit}`);
                        console.log(`      brut_weight: ${ing.brut_weight}`);
                    }
                }

                // Check sub_components too
                for (const sc of (prep.sub_components || [])) {
                    if ((sc.name || '').toLowerCase().includes('arroz')) {
                        console.log(`    - Sub-componente: "${sc.name}"`);
                        console.log(`      recipe_id: ${sc.recipe_id || 'N/A'}`);
                        console.log(`      input_yield_weight: ${sc.input_yield_weight}`);
                    }
                }
            }
        }
    }

    // 3) Buscar TODAS as receitas que usam ingrediente com nome "Arroz Tipo 1" (sem "Branco")
    console.log('\n====================================================');
    console.log('   RECEITAS QUE USAM "ARROZ TIPO 1" (SEM BRANCO)');
    console.log('====================================================\n');

    const allRecipes = [];
    recipeSnap.forEach(d => allRecipes.push({ id: d.id, ...d.data() }));

    for (const recipe of allRecipes) {
        let found = false;
        const locations = [];

        for (const ing of (recipe.ingredients || [])) {
            if ((ing.name || '').toLowerCase() === 'arroz tipo 1') {
                locations.push(`ingredients[] -> "${ing.name}" (id: ${ing.ingredient_id || ing.ingredientId || ing.id || 'N/A'})`);
                found = true;
            }
        }

        for (let pi = 0; pi < (recipe.preparations || []).length; pi++) {
            const prep = recipe.preparations[pi];
            for (const ing of (prep.ingredients || [])) {
                if ((ing.name || '').toLowerCase() === 'arroz tipo 1') {
                    locations.push(`preparations[${pi}] "${prep.title}" -> "${ing.name}" (id: ${ing.ingredient_id || ing.ingredientId || ing.id || 'N/A'})`);
                    found = true;
                }
            }
        }

        if (found) {
            console.log(`  📌 ${recipe.name} (${recipe.id})`);
            for (const loc of locations) {
                console.log(`     ${loc}`);
            }
            console.log('');
        }
    }

    process.exit(0);
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });
