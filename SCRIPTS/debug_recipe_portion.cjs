const admin = require('firebase-admin');

const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log("Fetching Recipe data for Macarronada a Bolonhesa Bendito KG...");

    const recipeSnap = await db.collection('Recipe')
        .where('name', '==', 'Rotisseria Macarronada a Bolonhesa Bendito KG')
        .get();

    if (recipeSnap.empty) {
        console.log("Recipe not found.");
        return;
    }

    const recipe = recipeSnap.docs[0].data();
    console.log(`\nRecipe Name: ${recipe.name}`);
    console.log(`Base Unit Type: ${recipe.unit_type}`);
    console.log(`Portion Weight Calc: ${recipe.portion_weight_calculated}`);

    if (recipe.preparations && recipe.preparations.length > 0) {
        recipe.preparations.forEach((prep, idx) => {
            console.log(`\nPrep [${idx + 1}]: ${prep.title} (Type: ${prep.type})`);

            if (prep.assembly_config) {
                console.log(`  Assembly Config:`);
                console.log(`    Unit Type: ${prep.assembly_config.unit_type}`);
                console.log(`    Units Qty: ${prep.assembly_config.units_quantity}`);
            }

            let totalWeight = 0;
            if (prep.components) {
                prep.components.forEach((comp, cIdx) => {
                    console.log(`    Component [${cIdx + 1}]: ${comp.name} | Weight: ${comp.weight} kg`);
                    totalWeight += (Number(comp.weight) || 0);
                });
            }
            console.log(`  => Total Components Weight: ${totalWeight.toFixed(3)} kg`);
        });
    }
}

run().catch(console.error).finally(() => process.exit(0));
