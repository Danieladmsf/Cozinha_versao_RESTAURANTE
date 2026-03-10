import { db } from './lib/firebase.js';
import { getDocs, collection } from 'firebase/firestore';
import { DemandCalculator } from './lib/production-engine/DemandCalculator.js';
import { RecipeEngine } from './lib/recipe-engine/RecipeEngine.js';

async function run() {
    console.log('Fetching recipes...');
    const snap = await getDocs(collection(db, 'Recipe'));
    let allRecipes = [];
    snap.forEach(d => {
        allRecipes.push({ id: d.id, ...d.data() });
    });

    const rotisseria = allRecipes.find(r => r.name && r.name.toLowerCase().includes('rotisseria feijao bendito kg'));

    const orders = [
        {
            customer_name: 'Test',
            items: [
                {
                    recipe_id: rotisseria.id,
                    quantity: 14 * 0.180, // Ordered 14 embalagens de 180g (peso bruto vendido = 2.520 kg)
                    unit_type: 'kg'
                }
            ]
        }
    ];

    const categoryMap = new Map();
    // Replace the explodeOrders briefly to print factors
    const originalExplode = DemandCalculator.explodeOrders.bind(DemandCalculator);
    DemandCalculator.explodeOrders = function (orders, allRecipes, categoryMap) {
        let factors = [];
        this.recursiveExplode = function (props) {
            factors.push(props.currentScale);
            // We just need the original recursive explode logic and the parentScale in processIngredientOrExplode
        };
        const leaf = originalExplode(orders, allRecipes, categoryMap);
        return leaf;
    }
    const leafIngredients = originalExplode(orders, allRecipes, categoryMap);

    console.log('\nResult of explosion:');
    console.log(`Rotisseria yield: ${RecipeEngine.parseValue(rotisseria.yield_weight)} kg, base yield: ${DemandCalculator.getRecipeYieldWeight(rotisseria, allRecipes)} kg`);
    leafIngredients.forEach(leaf => {
        if (leaf.ingredient.name && leaf.ingredient.name.toLowerCase().includes('feijão')) {
            console.log(`Ingredient: ${leaf.ingredient.name}`);
            console.log(`  Weight Raw in DB: ${leaf.ingredient.weight_raw}`);
            console.log(`  Weight Clean in DB: ${leaf.ingredient.weight_clean}`);
            console.log(`  Initial Weight Calculated: ${RecipeEngine.getInitialWeight(leaf.ingredient)}`);
            console.log(`  Scaled Qty: ${leaf.scaledQty} kg`);
            console.log(`  Scale Factor: ${leaf.scaledQty / RecipeEngine.getInitialWeight(leaf.ingredient)}`);
        }
    });

    process.exit(0);
}

run().catch(console.error);
