import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple mock for parseNumber
function parseNumber(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        let cleaned = val.trim().replace(/[^\d.,-]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    }
    return 0;
}

// Simple mock for RecipeEngine.calculateRecipeMetrics yielding just enough to trace what we need
function getRecipeYieldWeight(recipe, allRecipes = []) {
    if (!recipe || !recipe.preparations) return 0;

    // We only care about the weight returned by portion metrics or total weight
    let totalYieldWeight = 0;

    const assemblyPrep = recipe.preparations.find(prep =>
        prep.processes?.includes('assembly') ||
        prep.processes?.includes('portioning')
    );

    if (assemblyPrep && assemblyPrep.sub_components?.length > 0) {
        totalYieldWeight = assemblyPrep.sub_components.reduce((total, sc) => {
            if (sc.isPackaging || sc.is_packaging) return total;
            return total + parseNumber(sc.assembly_weight_kg);
        }, 0);
    } else if (assemblyPrep?.assembly_config?.total_weight) {
        totalYieldWeight = parseNumber(assemblyPrep.assembly_config.total_weight);
    } else {
        // Fallback: sum all ingredient weights across non-assembly preparations
        recipe.preparations.forEach(prep => {
            if (prep.processes?.includes('packaging')) return;
            (prep.ingredients || []).forEach(ing => {
                const w = parseNumber(ing.weight_rendered) || parseNumber(ing.weight_portioned) || parseNumber(ing.weight_cooked) || parseNumber(ing.weight_clean) || parseNumber(ing.weight_raw) || parseNumber(ing.quantity);
                totalYieldWeight += w;
            });
        });
    }

    return totalYieldWeight;
}

async function start() {
    console.log("Fetching Orders...");
    const ordersSnap = await getDocs(collection(db, "Order"));
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const dayOrders = orders.filter(o => o.week_number === 10 && o.year === 2026 && o.day_of_week === 3); // Tuesday for testing

    console.log("Fetching Products...");
    const productsSnap = await getDocs(collection(db, "Product"));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data(), entityType: 'product' }));

    console.log("Fetching Recipes...");
    const recipeSnap = await getDocs(collection(db, "Recipe"));
    const recipes = recipeSnap.docs.map(d => ({ id: d.id, ...d.data(), entityType: 'recipe' }));

    const allRecipes = [...recipes, ...products];

    console.log(`Testing explodeOrders on ${dayOrders.length} orders`);

    dayOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(orderItem => {
            if (!orderItem.recipe_id) return;

            let recipe = allRecipes.find(r => r.id === orderItem.recipe_id);
            if (!recipe) {
                console.log(`[SKIP] Recipe not found for id ${orderItem.recipe_id}`);
                return;
            }

            let baseRecipe = recipe;
            if (!recipe.preparations && recipe.recipe_id) {
                baseRecipe = allRecipes.find(r => r.id === recipe.recipe_id) || recipe;
            }

            if (!baseRecipe.preparations) {
                console.log(`[SKIP] No preparations found for ${orderItem.recipe_name} | Base ID: ${baseRecipe.id}`);
                return;
            }

            const orderedQty = parseNumber(orderItem.quantity);
            if (orderedQty <= 0) {
                console.log(`[SKIP] Ordered Qty <= 0 for ${orderItem.recipe_name}`);
                return;
            }

            const recipeYieldWeight = getRecipeYieldWeight(baseRecipe, allRecipes);
            if (recipeYieldWeight <= 0) {
                console.log(`[SKIP] Yield Weight <= 0 for ${orderItem.recipe_name} | Value: ${recipeYieldWeight}`);
                return;
            }

            console.log(`[SUCCESS] Passed conditions for ${orderItem.recipe_name}. Ordered: ${orderedQty}, Yield: ${recipeYieldWeight}`);
        });
    });
}

start().then(() => process.exit(0));
