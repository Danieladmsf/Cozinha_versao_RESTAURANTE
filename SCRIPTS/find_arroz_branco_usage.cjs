const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    try {
        // =============================================
        // 1) Buscar INGREDIENTES que contenham "Arroz Branco"
        // =============================================
        console.log('====================================================');
        console.log('   BUSCANDO INGREDIENTES "ARROZ BRANCO" NO FIREBASE');
        console.log('====================================================\n');

        const ingSnap = await db.collection('Ingredient').get();
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

        // =============================================
        // 2) Buscar TODAS as receitas e verificar quais usam cada ingrediente
        // =============================================
        console.log('\n====================================================');
        console.log('   BUSCANDO RECEITAS QUE USAM CADA "ARROZ BRANCO"');
        console.log('====================================================\n');

        const recipeSnap = await db.collection('Recipe').get();
        const allRecipes = [];
        recipeSnap.forEach(doc => {
            allRecipes.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Total de receitas no banco: ${allRecipes.length}\n`);

        // Map: ingredientId -> [recipes that use it]
        const usageMap = {};
        for (const ing of arrozIngredients) {
            usageMap[ing.id] = { ingredientName: ing.name, recipes: [] };
        }

        for (const recipe of allRecipes) {
            // Check in top-level ingredients
            const topIngredients = recipe.ingredients || [];
            for (const ri of topIngredients) {
                const refId = ri.ingredient_id || ri.ingredientId || ri.id || '';
                const refName = ri.name || '';
                for (const ing of arrozIngredients) {
                    if (refId === ing.id || refName === ing.name) {
                        usageMap[ing.id].recipes.push({
                            recipeId: recipe.id,
                            recipeName: recipe.name,
                            location: 'ingredients[]',
                            ingredientRefName: refName,
                            quantity: ri.quantity || ri.brut_weight || 'N/A',
                            unit: ri.unit || 'N/A'
                        });
                    }
                }
            }

            // Check in preparations[].ingredients
            const preparations = recipe.preparations || [];
            for (let pi = 0; pi < preparations.length; pi++) {
                const prep = preparations[pi];
                const prepIngredients = prep.ingredients || [];
                for (const ri of prepIngredients) {
                    const refId = ri.ingredient_id || ri.ingredientId || ri.id || '';
                    const refName = ri.name || '';
                    for (const ing of arrozIngredients) {
                        if (refId === ing.id || refName === ing.name) {
                            usageMap[ing.id].recipes.push({
                                recipeId: recipe.id,
                                recipeName: recipe.name,
                                location: `preparations[${pi}].ingredients (${prep.title || 'sem título'})`,
                                ingredientRefName: refName,
                                quantity: ri.quantity || ri.brut_weight || 'N/A',
                                unit: ri.unit || 'N/A'
                            });
                        }
                    }
                }
            }
        }

        // =============================================
        // 3) Exibir resultados
        // =============================================
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
                    console.log(`     Ref Name: ${r.ingredientRefName}`);
                    console.log(`     Qtd: ${r.quantity} ${r.unit}`);
                    console.log('');
                }
            }
        }

    } catch (e) {
        console.error('Erro:', e);
    }
}

run();
