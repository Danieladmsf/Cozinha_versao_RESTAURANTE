const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    const r1 = await db.collection('Recipe').doc('sWQO11n1TwcQClThQJUG').get();
    const strogonoff = r1.data();
    console.log("Strogonoff Preparations/Subcomponents:", JSON.stringify(strogonoff.preparations, null, 2));

    // Encontrar ID do Arroz Branco
    strogonoff.preparations.forEach(p => {
        if (p.sub_components) {
            p.sub_components.forEach(sub => {
                if (sub.name.toLowerCase().includes('arroz')) console.log("SUB ARROZ:", sub);
            });
        }
    });
}
run();
