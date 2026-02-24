const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// FUNÇÕES COPIADAS DO CÓDIGO FONTE
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
                // EVITAR CONTA DUPLA: Se o sub_component aponta para um preparation interno desta mesma receita,
                // ele JÁ FOI processado no loop principal de ingredients. Não devemos buscar receitas externas.
                const isInternalPrep = recipe.preparations && recipe.preparations.some(p => p.id === sub.source_id || p.id === sub.recipe_id || p.id === sub.id);
                if (isInternalPrep) return;

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

async function run() {
    try {
        console.log("Buscando Receitas...");
        const recipesSnap = await db.collection('Recipe').get();
        const recipes = [];
        recipesSnap.forEach(r => recipes.push({ id: r.id, ...r.data() }));

        const recipeQuantities = {
            "6XoBSDRdmymCIWULlPks": 4.4117,
            "KpmaqOh0chO1O6DNmmP": 12.666,
            "51SWmvzycOLNTeDHyyRZ": 2.038,
            "93O6wLWDEFtoVwEAY4Ai": 1.947,
            "Jj87AaREF6dtHyM9VAYc": 7.375,
            "KqM8Yx1OMKDIpoYfmykQ": 6.55,
            "P3McQwWqNtiDSF6qT9Rh": 1.196,
            "VjK5U266UovpBtLnHoK0": 1.58,
            "VkvrvMEljWOVxCBxmczQ": 16,
            "XM4Pm2eAhNNbBcbkkVJt": 2.801,
            "cebIcHnAeytdjhu2zMSe": 38.486,
            "or3hnqRzJVk7hruG3v8a": 3.582,
            "otpZD1YH3pmscvlaBTga": 9.268,
            "pcu3mwvrOkStdzNShFQb": 2.463,
            "qC5PydN8xlngSNqJTIhP": 1.92,
            "sWQO11n1TwcQClThQJUG": 20,
            "vZrSIJ5GjJF0vDEANBpl": 6.556,
            "xGHXyVAa07aYA1Wf9qbi": 2.593,
            "xNgjBuy4CeSVvtm8sW9U": 20.75
        };

        const allIngredients = [];
        const breakdown = {};

        console.log("Extrapolando receitas localmente:");
        Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
            const recipe = recipes.find(r => r.id === recipeId);
            if (recipe && quantity > 0) {
                const ingredients = extractIngredientsFromRecipe(recipe, quantity, recipes);
                allIngredients.push(...ingredients);

                // Track breakdown for arroz
                const arrozReqs = ingredients.filter(i => i.name.toLowerCase().includes('arroz'));
                if (arrozReqs.length > 0) {
                    const sumWeight = arrozReqs.reduce((acc, curr) => acc + curr.weight, 0);
                    breakdown[recipe.name] = sumWeight;
                }
            }
        });

        const cons = consolidateDuplicateIngredients(allIngredients);

        for (const c of cons) {
            if (c.name.toLowerCase().includes('arroz')) {
                console.log(`\n==========================================`);
                console.log(`=> INGREDIENTE FINAL: ${c.name}`);
                console.log(`   Qtd: ${c.totalQuantity.toFixed(3)} | Peso: ${c.totalWeight.toFixed(3)}kg`);
                console.log(`\nBREAKDOWN DE CONSUMO POR RECEITA:`);
                for (let r in breakdown) {
                    if (breakdown[r] > 0) {
                        console.log(`   - ${r}: ${breakdown[r].toFixed(3)} kg`);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
