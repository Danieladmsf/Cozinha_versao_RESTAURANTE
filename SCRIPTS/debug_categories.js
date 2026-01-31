import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();





async function checkCategories() {
    console.log('--- Analyze CategoryTree for Rotisseria ---');
    const treeSnapshot = await db.collection('CategoryTree').get();
    const allDocs = [];
    treeSnapshot.forEach(doc => allDocs.push({ id: doc.id, ...doc.data() }));

    const relevantNames = [
        "MARMITA 3 DIVISÓRIAS", "MACARRÃO", "MASSAS", "MONO ARROZ",
        "MONO FEIJÃO", "MONO GUARNIÇÃO", "MONO PROTEÍNAS", "SALADAS PROTEICAS",
        "SALADAS COZIDAS", "SUSHI", "POKE", "TEMAKI", "MOLHOS", "PATÊS", "GELEIAS"
    ];

    const matches = allDocs.filter(d => {
        const name = d.name.toUpperCase();
        return relevantNames.some(r => name.includes(r.toUpperCase()));
    });

    matches.forEach(m => console.log(`Matched: ${m.name} (ID: ${m.id}, Level: ${m.level}, Parent: ${m.parent_id})`));
}


async function checkRotisseria() {
    console.log('--- Checking ROTISSERIA Category ---');
    const snapshot = await db.collection('CategoryTree').where('name', '==', 'ROTISSERIA').get();
    snapshot.forEach(doc => {
        console.log(`[ROTISSERIA] ID: ${doc.id}, Type: ${doc.data().type}, Level: ${doc.data().level}`);
    });
}

async function checkRecipes() {
    console.log('--- Checking Recent Recipes ---');
    const snapshot = await db.collection('Recipe')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    if (snapshot.empty) {
        console.log('No recipes found.');
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            console.log(`[Recipe] Code: ${d.code} | Name: ${d.name} | Category: ${d.category} | Active: ${d.active}`);
        });
    }
}

checkCategories();
checkRecipes();
