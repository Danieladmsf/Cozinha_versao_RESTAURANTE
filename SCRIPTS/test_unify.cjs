const admin = require('firebase-admin');

const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log("--- Ingredient Collection Detail ---");
    const ingSnap = await db.collection('Ingredient').limit(1).get();
    ingSnap.forEach(doc => {
        console.log("ID:", doc.id);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    console.log("\n--- Recipe Ingredients Structure ---");
    const recSnap = await db.collection('Recipe').limit(5).get();
    let found = false;
    recSnap.forEach(doc => {
        const data = doc.data();
        if (data.preparations && !found) {
            for (const prep of data.preparations) {
                if (prep.ingredients && prep.ingredients.length > 0) {
                    console.log("Recipe:", data.name);
                    console.log("First Ingredient in Prep:");
                    console.log(JSON.stringify(prep.ingredients[0], null, 2));
                    found = true;
                    break;
                }
            }
        }
    });
}

run().catch(console.error).finally(() => process.exit(0));
