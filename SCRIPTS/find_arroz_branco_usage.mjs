import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
    // 1) Buscar INGREDIENTES "Arroz Branco"
    console.log('====================================================');
    console.log('   BUSCANDO INGREDIENTES "ARROZ BRANCO" NO FIREBASE');
    console.log('====================================================\n');

    const ingSnap = await getDocs(collection(db, 'Ingredient'));
    const arrozIngredients = [];
    ingSnap.forEach(doc => {
        const data = doc.data();
        if ((data.name || '').toLowerCase().includes('arroz branco')) {
            arrozIngredients.push({ id: doc.id, ...data });
        }
    });

    console.log(`Encontrados ${arrozIngredients.length} ingrediente(s) com "Arroz Branco":\n`);
    for (const ing of arrozIngredients) {
        console.log(`  ID: ${ing.id}`);
        console.log(`  Nome: ${ing.name}`);
        console.log(`  Categoria: ${ing.category || 'N/A'}`);
        console.log(`  Unidade: ${ing.unit || 'N/A'}`);
        console.log(`  Preço: R$ ${ing.price || 'N/A'}`);
        console.log(`  Status: ${ing.status || 'N/A'}`);
        console.log(`  Fornecedor: ${ing.supplier_name || 'N/A'}`);
        console.log('  ---');
    }

    // 2) Buscar TODAS as receitas
    console.log('\n====================================================');
    console.log('   BUSCANDO RECEITAS QUE USAM CADA "ARROZ BRANCO"');
    console.log('====================================================\n');

    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    const allRecipes = [];
    recipeSnap.forEach(doc => {
        allRecipes.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Total de receitas no banco: ${allRecipes.length}\n`);

    // Map: ingredientId -> recipes
    const usageMap = {};
    for (const ing of arrozIngredients) {
        usageMap[ing.id] = { ingredientName: ing.name, recipes: [] };
    }

    for (const recipe of allRecipes) {
        // Check top-level ingredients
        for (const ri of (recipe.ingredients || [])) {
            const refId = ri.ingredient_id || ri.ingredientId || ri.id || '';
            const refName = ri.name || '';
            for (const ing of arrozIngredients) {
                if (refId === ing.id || refName === ing.name) {
                    usageMap[ing.id].recipes.push({
                        recipeId: recipe.id,
                        recipeName: recipe.name,
                        location: 'ingredients[]',
                        refName,
                        quantity: ri.quantity || ri.brut_weight || 'N/A',
                        unit: ri.unit || 'N/A'
                    });
                }
            }
        }

        // Check preparations[].ingredients
        for (let pi = 0; pi < (recipe.preparations || []).length; pi++) {
            const prep = recipe.preparations[pi];
            for (const ri of (prep.ingredients || [])) {
                const refId = ri.ingredient_id || ri.ingredientId || ri.id || '';
                const refName = ri.name || '';
                for (const ing of arrozIngredients) {
                    if (refId === ing.id || refName === ing.name) {
                        usageMap[ing.id].recipes.push({
                            recipeId: recipe.id,
                            recipeName: recipe.name,
                            location: `preparations[${pi}] (${prep.title || 'sem título'})`,
                            refName,
                            quantity: ri.quantity || ri.brut_weight || 'N/A',
                            unit: ri.unit || 'N/A'
                        });
                    }
                }
            }
        }
    }

    // 3) Exibir resultados
    for (const ingId of Object.keys(usageMap)) {
        const entry = usageMap[ingId];
        console.log(`\n========================================`);
        console.log(`INGREDIENTE: "${entry.ingredientName}" (ID: ${ingId})`);
        console.log(`========================================`);

        if (entry.recipes.length === 0) {
            console.log('  ⚠️  Nenhuma receita usa este ingrediente!\n');
        } else {
            console.log(`  Total de receitas que usam: ${entry.recipes.length}\n`);
            for (const r of entry.recipes) {
                console.log(`  📌 ${r.recipeName}`);
                console.log(`     Recipe ID: ${r.recipeId}`);
                console.log(`     Local: ${r.location}`);
                console.log(`     Ref Name: ${r.refName}`);
                console.log(`     Qtd: ${r.quantity} ${r.unit}`);
                console.log('');
            }
        }
    }

    process.exit(0);
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });
