
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
    await readFile(new URL('../serviceAccountKey.json', import.meta.url))
);

if (!serviceAccount) process.exit(1);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function checkSpecificRecipes() {
    const names = ['Arroz Branco', 'MD - Arroz, Feijão, Farofa, Bife acebolado'];
    console.log('Verificando tipos para:', names);

    const snapshot = await db.collection('recipes').get();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (names.some(n => data.name && data.name.includes(n.split(',')[0]))) { // Match parcial
            console.log(`\nNome: ${data.name}`);
            console.log(`Tipo: ${data.type}`);
            console.log(`ID: ${doc.id}`);
        }
    });
}

checkSpecificRecipes().catch(console.error);
