const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    const arrozDocs = await db.collection('Recipe').where('name', '==', 'Arroz Branco').get();
    arrozDocs.forEach(d => {
        const arroz = d.data();
        console.log(`\n==============`);
        console.log(`ID: ${d.id}`);
        console.log(`Yield_weight = ${arroz.yield_weight}`);

        if (arroz.preparations) {
            arroz.preparations.forEach((p, i) => {
                console.log(`Etapa ${i}:`, p.title);
                if (p.ingredients) {
                    p.ingredients.forEach(ing => {
                        console.log(`  - Ingrediente: ${ing.name} | qty: ${ing.quantity} | unit: ${ing.unit} | w_frozen: ${ing.weight_frozen} | w_raw: ${ing.weight_raw} | w_pre: ${ing.weight_pre_cooking}`);
                    });
                }
            });
        }
    });
}
run();
