import { db } from './lib/firebase.js';
import { getDocs, collection } from 'firebase/firestore';

async function run() {
    console.log('Fetching recipes...');
    const snap = await getDocs(collection(db, 'Recipe'));
    let allRecipes = [];
    snap.forEach(d => {
        allRecipes.push({ id: d.id, ...d.data() });
    });

    const rotisseria = allRecipes.find(r => r.name && r.name.toLowerCase().includes('rotisseria feijao bendito kg'));
    if (!rotisseria) {
        console.log('Recipe "Rotisseria Feijao Bendito Kg" not found');
        process.exit(1);
    }

    console.log(`Found Rotisseria: ${rotisseria.name} (ID: ${rotisseria.id})`);

    let baseRecipe = rotisseria;
    if (!rotisseria.preparations && rotisseria.recipe_id) {
        baseRecipe = allRecipes.find(r => r.id === rotisseria.recipe_id) || rotisseria;
        console.log(`Resolved to base recipe: ${baseRecipe.name} (ID: ${baseRecipe.id})`);
    }

    if (baseRecipe.preparations) {
        baseRecipe.preparations.forEach((prep, idx) => {
            console.log(`\nPreparation ${idx + 1}: ${prep.title || 'Untitled'}`);
            console.log(`Processes: ${prep.processes ? prep.processes.join(', ') : 'None'}`);
            if (prep.ingredients) {
                prep.ingredients.forEach(ing => {
                    if (ing.name && ing.name.toLowerCase().includes('feijao') || ing.name.toLowerCase().includes('feijão')) {
                        console.log(`  Ingredient: ${ing.name}`);
                        console.log(`    weight_raw: ${ing.weight_raw}`);
                        console.log(`    weight_clean: ${ing.weight_clean}`);
                        console.log(`    weight_cooked: ${ing.weight_cooked}`);
                        console.log(`    isPackaging: ${ing.isPackaging || ing.is_packaging}`);
                        console.log(`    task_type: ${ing.task_type}`);
                    }
                });
            }
        });
    } else {
        console.log('No preparations found for base recipe.');
    }

    process.exit(0);
}

run().catch(console.error);
