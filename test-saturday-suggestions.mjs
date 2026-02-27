import { OrderSuggestionManager } from './lib/order-suggestions.js';
import { Customer, Recipe } from './app/api/entities.js';

async function run() {
    try {
        const custs = await Customer.query([{ field: 'slug', operator: '==', value: 'descontao' }]);
        if (custs.length === 0) {
            console.log('Customer not found');
            return;
        }
        const customer = custs[0];
        const recipes = await Recipe.list();

        // Pick a test recipe that would typically get a suggestion
        const sampleRecipe = recipes.find(r => r.name.includes('Marmita') || r.category === 'COMIDA JAPONESA' || r.name.includes('Lasanha'));
        const testItems = [{
            unique_id: 'test_1',
            recipe_id: sampleRecipe.id,
            recipe_name: sampleRecipe.name,
            category: sampleRecipe.category,
            unit_type: 'unid',
            shelf_life: 1,
            sales_window: 'all_day'
        }];

        console.log(`Testing with Recipe: ${sampleRecipe.name}`);

        // Saturday is dayOfWeek = 6 in JS/date-fns, but the script might use 0-6 or 1-7
        const dayOfWeek = 6;

        const result = await OrderSuggestionManager.generateOrderSuggestions(
            customer.id,
            testItems,
            0,
            {
                dayOfWeek: dayOfWeek,
                useVrSales: true,
                fullRecipes: recipes,
                lookbackWeeks: 12,
                rawValues: true,
                storeId: customer.vr_store_id || customer.store_id
            }
        );

        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Error:', err);
    }
}

run();

