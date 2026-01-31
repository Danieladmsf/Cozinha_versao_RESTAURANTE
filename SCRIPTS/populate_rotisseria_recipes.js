
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const DATA = {
    "MARMITA 3 DIVISORIAS": [
        "007768 – REFEIÇÃO LAGARTO M. MADEIRA + BATATA ASSADA",
        "008966 – REFEIÇÃO ISCA DE FRANGO À MILANESA",
        "007875 – REFEIÇÃO STROGONOFF FRANGO",
        "007877 – REFEIÇÃO TIRINHA CARNE CHINESA",
        "007673 – REFEIÇÃO FILÉ FRANGO PARMEGIANA",
        "008948 – REFEIÇÃO COPA LOMBO SUÍNA À MILANESA",
        "007625 – REFEIÇÃO CARNE PANELA",
        "007796 – REFEIÇÃO MEDALHÃO FRANGO",
        "009362 – REFEIÇÃO ISCA DE FRANGO ACEBOLADA",
        "007874 – REFEIÇÃO STROGONOFF CARNE",
        "007660 – REFEIÇÃO FEIJOADA"
    ],
    "MACARRÃO": [
        "008480 – MACARRONADA À BOLONHESA",
        "093626 – MACARRÃO COM BRÓCOLIS E BACON",
        "008442 – MACARRÃO COM CALABRESA AO MOLHO ROSÉ",
        "008321 – ESPAGUETE À BOLONHESA + POLPETONE",
        "008900 – YAKISSOBA",
        "008400 – LASANHA À BOLONHESA",
        "006960 – NHOQUE AO MOLHO SUGO",
        "008663 – RONDELE FRANGO COM REQUEIJÃO"
    ],
    "MONO ARROZ": [
        "008028 – ARROZ BRANCO"
    ],
    "MONO FEIJÃO": [
        "008328 – FEIJÃO",
        "008336 – FEIJOADA"
    ],
    "MONO GUARNIÇÃO": [
        "008089 – BATATA ASSADA",
        "008598 – PURÊ DE BATATA",
        "008403 – LEGUMES",
        "008080 – BANANA",
        "008292 – CREME DE MILHO",
        "008391 – JILÓ FRITO",
        "008153 – BERINJELA À PIZZAIOLO",
        "008279 – COUVE-FLOR EMPANADA",
        "008323 – FAROFA"
    ],
    "MONO PROTEINAS": [
        "008409 – LINGUIÇA ASSADA",
        "008361 – FILÉ SOBRECOXA ASSADA",
        "008491 – MEDALHÃO DE FRANGO",
        "008602 – QUIBE ASSADO",
        "008349 – FILÉ FRANGO PARMEGIANA",
        "008284 – COXA SOBRECOXA ASSADA",
        "008381 – FRANGO XADREZ",
        "008834 – STROGONOFF DE CARNE",
        "008298 – DOBRADINHA",
        "008804 – SOBRECOXA RECHEADA"
    ],
    "SALADAS PROTEICAS": [
        "008963 – SALADA CAESAR COM FRANGO",
        "008962 – SALADA MIX DE FOLHAS COM PROTEÍNAS"
    ],
    "SALADAS COZIDAS": [
        "008221 – CAPONATA DE BERINJELA",
        "008789 – SUNOMONO",
        "008695 – SALADA DE BETERRABA",
        "008690 – SALADA DE BATATA CURTINHA"
    ],
    "SUSHI": [
        "009124 – HOT ROLL",
        "009119 – CALIFÓRNIA",
        "009123 – SUSHI KANI COM CREAM CHEESE"
    ],
    "POKE /TEMAKI": [ // Use exact name found in debug or create new
        "009125 – POKE DE KANI",
        "009129 – POKE DE SHIMEJI",
        "009289 – TEMAKI HOT SALMÃO GRELHADO"
    ],
    "MOLHOS / PATÊS / GELEIAS": [ // Use exact name or create new
        "008386 – GELEIA DE PIMENTA",
        "008551 – PATÊ DE ALHO",
        "007575 – PATÊ DE AZEITONA VERDE",
        "007576 – PATÊ DE GORGONZOLA",
        "007570 – MOLHO PESTO"
    ]
};

async function run() {
    console.log('Starting import...');

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
    console.log(`Rotisseria ID: ${rotisseriaId}`);

    // 2. Iterate keys
    for (const catName of Object.keys(DATA)) {
        console.log(`\nProcessing Category: ${catName}`);

        // Find category ID
        // Note: User used "MONO PROTEINAS" but DB might have "MONO PROTEÍNAS" (accent).
        // Flexible matching.
        let catId = null;

        // Try exact match first
        let catQuery = await db.collection('CategoryTree')
            .where('name', '==', catName)
            .where('parent_id', '==', rotisseriaId)
            .get();

        if (catQuery.empty) {
            // Try without accents or partial match logic if needed, or create.
            // For "POKE /TEMAKI", DB showed "POKE /TEMAKI" in my manual check? 
            // Wait, in step 613: "Matched: POKE /TEMAKI (ID: eB7XDDqxzm9nUk6vlqGU"
            // So that one exists.

            // "MOLHOS / PATÊS / GELEIAS" -> Likely needs creation.
            // "MONO PROTEINAS" -> Maybe "MONO PROTEÍNAS"?

            console.log(`Category '${catName}' not found EXACTLY. Trying fuzzy or creating...`);

            // Check "MONO PROTEINAS" vs "MONO PROTEÍNAS"
            if (catName === "MONO PROTEINAS") {
                const manualCheck = await db.collection('CategoryTree').where('name', '==', 'MONO PROTEÍNAS').where('parent_id', '==', rotisseriaId).get();
                if (!manualCheck.empty) {
                    catId = manualCheck.docs[0].id;
                    console.log(`-> Found as 'MONO PROTEÍNAS'`);
                }
            }

            if (!catId) {
                console.log(`-> Creating new category: ${catName}`);
                const newCat = await db.collection('CategoryTree').add({
                    name: catName,
                    parent_id: rotisseriaId,
                    level: 2,
                    type: 'receitas',
                    active: true,
                    order: 99
                });
                catId = newCat.id;
            }
        } else {
            catId = catQuery.docs[0].id;
        }

        if (!catId) {
            console.error(`Could not resolve category for ${catName}`);
            continue;
        }

        // 3. Process Recipes
        const recipes = DATA[catName];
        for (const recipeStr of recipes) {
            // Parse Code and Name
            // Format: "007768 – REFEIÇÃO LAGARTO M. MADEIRA + BATATA ASSADA"
            // Split by " – " (en dash) or " - " (hyphen)? User pasted " – "
            const parts = recipeStr.split(' – ');
            if (parts.length < 2) {
                console.error(`Invalid format: ${recipeStr}`);
                continue;
            }
            const code = parts[0].trim();
            const name = parts[1].trim();

            console.log(`   Upserting Recipe: [${code}] ${name}`);

            // Check if exists by code to avoid duplicate? 
            // Or upsert by name? 
            // Let's assume unique code.
            const recipeQuery = await db.collection('Recipe').where('code', '==', code).get();

            const recipeData = {
                code: code,
                name: name, // User wants "Code - Name"? Or just Name? User input: "007768 – REFEIÇÃO..."
                // Usually better to have Name = "REFEIÇÃO..." and Code = "007768".
                // But user said: "here is the name of the category, code and name of the recipe".
                // "007768 – REFEIÇÃO LAGARTO..." -> This whole string is often used as name in legacy systems.
                // Let's split it properly.
                category: catName, // Legacy text field? Or ID? Recipes.jsx uses name matching?
                // Recipes.jsx line 597: {recipe.category} (renders name)
                // Recipes.jsx line 327: getRootCategoryType(recipe.category) -> finds by name in tree.
                // So we save the Category NAME.
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
