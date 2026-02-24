const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const calculateRecipeQuantities = (orders, recipes) => {
    const recipeQuantities = {};
    orders.forEach((order, orderIndex) => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
                if (item.recipe_id && item.quantity) {
                    const recipe = recipes.find(r => r.id === item.recipe_id);
                    if (!recipe) return;

                    let recipeMultiplier = 0;
                    const itemQuantity = parseFloat(item.quantity);
                    const unitType = (item.unit_type || '').toLowerCase();

                    if (unitType === 'cuba' || unitType === 'cuba-g' || unitType === 'cuba-p') {
                        recipeMultiplier = itemQuantity;
                    } else if (unitType === 'unid.' || unitType === 'porção' || unitType === 'unidade' || unitType === 'un') {
                        const portionWeight = recipe.portion_weight_calculated || 0.06;
                        const cubaWeight = recipe.cuba_weight || 1;
                        const portionsPerCuba = cubaWeight / portionWeight;
                        recipeMultiplier = itemQuantity / portionsPerCuba;
                    } else if (unitType === 'kg') {
                        const yieldWeight = recipe.yield_weight || recipe.cuba_weight || 1;
                        recipeMultiplier = itemQuantity / yieldWeight;
                    } else {
                        recipeMultiplier = itemQuantity;
                    }

                    if (!recipeQuantities[item.recipe_id]) {
                        recipeQuantities[item.recipe_id] = { qty: 0, nome: recipe.name, unitReceived: unitType, calcMultiplier: 0 };
                    }
                    recipeQuantities[item.recipe_id].qty += itemQuantity;
                    recipeQuantities[item.recipe_id].calcMultiplier += recipeMultiplier;
                }
            });
        }
    });
    return recipeQuantities;
};

const { consolidateIngredientsFromRecipes } = require('./components/programacao/lista-compras/utils/ingredientConsolidatorFixed');

async function run() {
    try {
        console.log("Buscando Receitas...");
        const recipesSnap = await db.collection('Recipe').get();
        const recipes = [];
        recipesSnap.forEach(r => recipes.push({ id: r.id, ...r.data() }));

        const itemsBendito = [
            { recipe_name: 'Refeicao: Arroz, Farofa, Batata Assada e Strogonoff Carne Bendito UN', quantity: 10, unit_type: 'unidade' },
            { recipe_name: 'Refeição: Arroz, Farofa, [creme/pure] e File Sobre-coxa Assada Bendito UN', quantity: 8, unit_type: 'unidade' },
            { recipe_name: 'Rotisseria Arroz Branco Bendito KG', quantity: 1.439, unit_type: 'kg' }
        ];

        const itemsDescontao = [
            { recipe_name: 'Refeicao: Arroz, Farofa, Batata Assada e Strogonoff Carne Bendito UN', quantity: 10, unit_type: 'unidade' },
            { recipe_name: 'Refeição: Arroz, Farofa, [creme/pure] e File Sobre-coxa Assada Bendito UN', quantity: 8, unit_type: 'unidade' },
            { recipe_name: 'Rotisseria Arroz Branco Bendito KG', quantity: 1.362, unit_type: 'kg' }
        ];

        function populateRecipeIds(items) {
            items.forEach(it => {
                const r = recipes.find(rec => rec.name === it.recipe_name);
                if (r) it.recipe_id = r.id;
            });
        }
        populateRecipeIds(itemsBendito);
        populateRecipeIds(itemsDescontao);

        const targetOrders = [
            { customer_name: 'Bendito Beef', items: itemsBendito },
            { customer_name: 'Descontão', items: itemsDescontao }
        ];

        console.log("\nExecutando consolidator global...");
        const cons = consolidateIngredientsFromRecipes(targetOrders, recipes);

        for (const c of cons) {
            if (c.name.toLowerCase().includes('arroz')) {
                console.log(`\n==========================================`);
                console.log(`=> INGREDIENTE: ${c.name}`);
                console.log(`   Qtd: ${c.totalQuantity.toFixed(3)} | Peso: ${c.totalWeight.toFixed(3)}kg`);
                console.log(`   Receitas que demandam:`, c.recipes.join(", "));
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
