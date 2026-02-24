const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// FUNÇÕES COPIADAS DO CÓDIGO FONTE DA APLICAÇÃO:
const getIngredientWeight = (ingredient) => {
    const parseWeight = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'string') {
            value = value.replace(',', '.');
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    };
    let weight = parseWeight(ingredient.weight_frozen);
    if (!weight) weight = parseWeight(ingredient.weight_raw);
    if (!weight) weight = parseWeight(ingredient.raw_weight);
    if (!weight) weight = parseWeight(ingredient.weight);
    if (!weight) weight = parseWeight(ingredient.weight_pre_cooking);
    if (!weight) weight = parseWeight(ingredient.weight_thawed);
    if (!weight) weight = parseWeight(ingredient.weight_clean);
    if (!weight && ingredient.weights) {
        weight = parseWeight(ingredient.weights.frozen);
        if (!weight) weight = parseWeight(ingredient.weights.raw);
        if (!weight) weight = parseWeight(ingredient.weights.pre_cooking);
        if (!weight) weight = parseWeight(ingredient.weights.thawed);
        if (!weight) weight = parseWeight(ingredient.weights.clean);
    }
    if (!weight) weight = parseWeight(ingredient.weight_cooked);
    if (!weight && ingredient.weights) {
        weight = parseWeight(ingredient.weights.cooked);
    }
    return weight;
};

const extractIngredientsFromRecipe = (recipe, recipeMultiplier, allRecipes = [], depth = 0) => {
    const ingredients = [];
    if (depth > 5) return [];
    if (!recipe.preparations || !Array.isArray(recipe.preparations)) {
        return ingredients;
    }
    recipe.preparations.forEach((preparation) => {
        if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
            preparation.ingredients.forEach((ingredient) => {
                if (!ingredient.name) return;
                const unit = (ingredient.unit || '').toLowerCase().trim();
                const quantity = parseFloat(ingredient.quantity) || 0;
                let weight = getIngredientWeight(ingredient);
                if ((!weight || weight === 0) && quantity > 0) {
                    if (['kg', 'l', 'litro', 'kilograma'].includes(unit)) {
                        weight = quantity;
                    } else if (['g', 'ml', 'grama'].includes(unit)) {
                        weight = quantity / 1000;
                    }
                }
                if (!weight || weight === 0) return;
                let lineTotalWeight = 0;
                const isMassUnit = ['kg', 'l', 'g', 'ml', 'litro', 'grama', 'mg'].includes(unit);
                if (isMassUnit) {
                    lineTotalWeight = weight;
                } else {
                    const mult = quantity === 0 ? 1 : quantity;
                    lineTotalWeight = weight * mult;
                }
                const totalWeight = lineTotalWeight * recipeMultiplier;
                ingredients.push({
                    name: ingredient.name.trim(),
                    category: ingredient.category || 'Outros',
                    unit: ingredient.unit || 'kg',
                    quantity: totalWeight,
                    weight: totalWeight,
                    recipe: recipe.name,
                    recipeCategory: recipe.category || 'Outros',
                    debug: { baseQuantity: quantity, unitWeight: weight, recipeMultiplier, totalWeight }
                });
            });
        }

        const processSubItems = (items) => {
            if (!items || !Array.isArray(items)) return;
            items.forEach(sub => {
                if (sub.type === 'recipe' || sub.recipe_id) {
                    let subRecipe = null;
                    if (sub.recipe_id) subRecipe = allRecipes.find(r => r.id === sub.recipe_id);
                    if (!subRecipe && sub.name) subRecipe = allRecipes.find(r => r.name === sub.name);
                    if (!subRecipe && sub.name) subRecipe = allRecipes.find(r => r.name.toLowerCase() === sub.name.toLowerCase());

                    if (subRecipe) {
                        let subYield = parseFloat(subRecipe.yield_weight);
                        if (!subYield || subYield === 0) {
                            if (subRecipe.preparations && subRecipe.preparations.length > 0) {
                                const last = subRecipe.preparations[subRecipe.preparations.length - 1];
                                subYield = parseFloat(last.weight_portioned || last.weight_cooked || last.weight_clean || 0);
                            }
                        }
                        if (!subYield || subYield === 0) subYield = 1000;
                        const subYieldKg = subYield < 10 ? subYield : subYield / 1000;
                        const usedWeight = parseFloat(sub.assembly_weight_kg || sub.weight_portioned || sub.used_weight || sub.quantity || 0);

                        if (usedWeight > 0 && subYieldKg > 0) {
                            const subMultiplier = (usedWeight / subYieldKg) * recipeMultiplier;
                            const subIngredients = extractIngredientsFromRecipe(subRecipe, subMultiplier, allRecipes, depth + 1);
                            ingredients.push(...subIngredients);
                        }
                    }
                }
            });
        };

        if (preparation.sub_components) processSubItems(preparation.sub_components);
        if (preparation.recipes) processSubItems(preparation.recipes);
    });
    return ingredients;
};

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
                    } else if (unitType === 'unid.' || unitType === 'porção') {
                        const portionWeight = recipe.portion_weight_calculated || 0.06;
                        const cubaWeight = recipe.cuba_weight || 1;
                        const portionsPerCuba = cubaWeight / portionWeight;
                        recipeMultiplier = itemQuantity / portionsPerCuba;
                    } else if (unitType === 'unidade' || unitType === 'un') {
                        // O código original só tem 'unid.' e 'porção'. 
                        // Se cair em "unidade" ou "un", ele cai no ELSE e faz = itemQuantity;
                        // VAMOS REPLICAR EXATAMENTE O ERRO DE LÁ: (caindo no fallback)
                        console.log(`\n⚠️ MATCH: ${unitType} para ${recipe.name}, caindo em fallback na ui?`);
                        recipeMultiplier = itemQuantity;
                    } else if (unitType === 'kg') {
                        const yieldWeight = recipe.yield_weight || recipe.cuba_weight || 1;
                        recipeMultiplier = itemQuantity / yieldWeight;
                    } else {
                        recipeMultiplier = itemQuantity;
                    }

                    if (!recipeQuantities[item.recipe_id]) {
                        recipeQuantities[item.recipe_id] = 0;
                    }
                    recipeQuantities[item.recipe_id] += recipeMultiplier;
                }
            });
        }
    });
    return recipeQuantities;
};

const consolidateDuplicateIngredients = (allIngredients) => {
    const consolidated = {};
    allIngredients.forEach(ingredient => {
        const key = `${ingredient.name}_${ingredient.unit}`.toLowerCase();
        if (consolidated[key]) {
            consolidated[key].totalQuantity += ingredient.quantity;
            consolidated[key].totalWeight += ingredient.weight;
            consolidated[key].usedInRecipes += 1;
            if (!consolidated[key].recipes.includes(ingredient.recipe)) {
                consolidated[key].recipes.push(ingredient.recipe);
            }
        } else {
            consolidated[key] = {
                name: ingredient.name,
                unit: ingredient.unit,
                totalQuantity: ingredient.quantity,
                totalWeight: ingredient.weight,
                usedInRecipes: 1,
                recipes: [ingredient.recipe],
            };
        }
    });
    return Object.values(consolidated);
};

const consolidateIngredientsFromRecipes = (orders, recipes) => {
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const allIngredients = [];
    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe && quantity > 0) {
            console.log(`\n--> EXTRAINDO INGS PARA RECEITA [${recipe.name}] (mult=${quantity})`);
            const ingredients = extractIngredientsFromRecipe(recipe, quantity, recipes);
            allIngredients.push(...ingredients);
        }
    });
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);
    return consolidatedIngredients;
};


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
