const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/kitchen-management-b5526-firebase-adminsdk-w1b9e-b9b5fc77f5.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function run() {
    try {
        const collections = await db.listCollections();
        console.log("Coleções disponíveis:");
        for (const col of collections) {
            console.log(`- ${col.id}`);
            // Contar alguns documentos
            const snap = await db.collection(col.id).limit(1).get();
            console.log(`   Possui documentos: ${!snap.empty}`);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
