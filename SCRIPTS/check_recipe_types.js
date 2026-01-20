import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
    await readFile(new URL('../serviceAccountKey.json', import.meta.url))
);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function analyzeRecipeTypes() {
    console.log('Analisando tipos de receitas...');
    const snapshot = await db.collection('recipes').get();

    const typeMap = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'undefined';

        if (!typeMap[type]) {
            typeMap[type] = [];
        }

        if (typeMap[type].length < 5) {
            typeMap[type].push(data.name);
        }
    });

    console.log('--- Tipos Encontrados ---');
    for (const [type, examples] of Object.entries(typeMap)) {
        console.log(`\nTYPE: "${type}"`);
        console.log('Exemplos:');
        examples.forEach(name => console.log(` - ${name}`));
    }
}

analyzeRecipeTypes().catch(console.error);
