// test-full-suggestions.js
import fetch from 'node-fetch'; // assuming fetch is available to call local Next.js APIs or we bypass it by importing Entities

async function queryVRAPI(customerId) {
    try {
        // Dynamic import to use server-side entities directly
        const { Customer, Recipe, OrderSuggestionManager, CategoryTree } = await import('./app/api/entities.js');

        const custs = await Customer.query([{ field: 'slug', operator: '==', value: 'descontao' }]);
        if (!custs || custs.length === 0) return console.log('Descontão not found');
        const customer = custs[0];

        const recipes = await Recipe.list();
        const categories = await CategoryTree.list();

        // Find "Marmita" related recipes or "Almoço"
        const activeRecipes = recipes.filter(r => r.active !== false && (r.name.includes('Marmita') || r.name.includes('Refeicao')));
        console.log(`Found ${activeRecipes.length} meal recipes`);

        if (activeRecipes.length === 0) return console.log('No recipes to test');

        // Mock the items as if they were in the order for selectedDay = 6 (Saturday)
        const testItems = activeRecipes.slice(0, 3).map((r, i) => ({
            unique_id: `test_id_${i}`,
            recipe_id: r.id,
            recipe_name: r.name,
            category: r.category,
            unit_type: 'unid',
            shelf_life: 1,
            sales_window: 'all_day',
            vr_product_code: r.code || r.product_code || r.external_code
        }));

        console.log("Testing generation for Day 6 (Saturday), Week 9 (Feb 22 - Feb 28, 2026)");
        const result = await OrderSuggestionManager.generateOrderSuggestions(
            customer.id,
            testItems,
            0,
            {
                dayOfWeek: 6, // 6 = Saturday
                useVrSales: true,
                fullRecipes: recipes,
                lookbackWeeks: 12,
                rawValues: true,
                storeId: customer.vr_store_id || customer.store_id
            }
        );

        console.log("Suggestions Generated:");
        console.log(JSON.stringify(result.metadata, null, 2));
        result.items.forEach(item => {
            console.log(`- ${item.recipe_name}: ${item.suggestion?.has_suggestion ? item.suggestion.suggested_base_quantity : 'No suggestion'} (${item.suggestion?.reason || item.suggestion?.source})`);
        });

    } catch (err) {
        console.error('Error runing suggestion test:', err);
    }
}

queryVRAPI();
