
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Manual mapping correction based on item analysis
// User provided headers were likely shifted or mismatched.
const DATA = {
    "MACARRÃO": [
        "008480 – ROTISSERIA MACARRONADA À BOLONHESA BENDITO KG", // Was under Marmita
        "008321 – ESPAGUETE À BOLONHESA + POLPETONE RECHEADO",    // Was under Marmita
        "008400 – ROTISSERIA LASANHA À BOLONHESA BENDITO KG"     // Was under Marmita
    ],
    "MONO ARROZ": [
        "008037 – ROTISSERIA ARROZ CARRETEIRO BENDITO KG", // Was under Macarrão
        "008023 – ROTISSERIA ARROZ À GREGA BENDITO KG"     // Was under Macarrão
    ],
    "SALADAS COZIDAS": [
        "006857 – ROTISSERIA MAIONESE DE LEGUMES COM FRANGO" // Was under Mono Arroz. Matches 'Maionese' to Salad.
    ],
    "MONO PROTEINAS": [ // "MONO PROTEINAS" in DB might be "MONO PROTEÍNAS"
        "093583 – ASSADO DE FRANGO BENDITO INTEIRO", // Was under Mono Proteinas (Correct)
        "093964 – ROTISSERIA CUPIM ASSADO AO MOLHO DE ALHO KG", // Was under Saladas Cozidas
        "008484 – ROTISSERIA MAMINHA ASSADA BENDITO KG"         // Was under Saladas Cozidas
    ]
};

async function run() {
    console.log('Starting EXTRA import...');

    // 1. Get Rotisseria ID
    const rotisseriaSnapshot = await db.collection('CategoryTree')
        .where('name', '==', 'ROTISSERIA')
        .where('level', '==', 1)
        .get();

    if (rotisseriaSnapshot.empty) {
        console.error('ROTISSERIA category not found!');
        return;
    }
    const rotisseriaId = rotisseriaSnapshot.docs[0].id;

    // 2. Iterate keys
    for (const catName of Object.keys(DATA)) {
        console.log(`\nProcessing Category: ${catName}`);

        // Fuzzy Search Category
        let catId = null;
        let targetName = catName;

        // Fix accents/typos if needed
        if (catName === "MONO PROTEINAS") targetName = "MONO PROTEÍNAS";

        let catQuery = await db.collection('CategoryTree')
            .where('name', '==', targetName)
            .where('parent_id', '==', rotisseriaId)
            .get();

        if (catQuery.empty) {
            // Create if missing?
            console.log(`Category '${targetName}' not found. Creating...`);
            const newCat = await db.collection('CategoryTree').add({
                name: targetName,
                parent_id: rotisseriaId,
                level: 2,
                type: 'receitas',
                active: true,
                order: 99
            });
            catId = newCat.id;
        } else {
            catId = catQuery.docs[0].id;
        }

        // 3. Process Recipes
        const recipes = DATA[catName];
        for (const recipeStr of recipes) {
            const parts = recipeStr.split(' – ');
            if (parts.length < 2) {
                console.error(`Invalid format: ${recipeStr}`);
                continue;
            }
            const code = parts[0].trim();
            const name = parts[1].trim();

            console.log(`   Upserting [${code}] ${name} -> ${targetName}`);

            const recipeQuery = await db.collection('Recipe').where('code', '==', code).get();

            const recipeData = {
                code: code,
                name: name,
                category: targetName, // Ensure we save the CORRECT category name
                active: true,
                updatedAt: new Date()
            };

            if (!recipeQuery.empty) {
                console.log(`      -> Updating existing recipe ${recipeQuery.docs[0].id}`);
                await db.collection('Recipe').doc(recipeQuery.docs[0].id).update(recipeData);
            } else {
                console.log(`      -> Creating new recipe`);
                await db.collection('Recipe').add({
                    ...recipeData,
                    createdAt: new Date()
                });
            }
        }
    }
}

run();
