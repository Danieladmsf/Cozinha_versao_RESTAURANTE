import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./FIREBASE/cozinha-afeto-firebase-adminsdk-vsz1u-c98f98ec85.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

async function checkRecipe() {
    const snapshot = await db.collection('WeeklyMenu').where('name', '>=', 'Rotisseria Arroz Branco').where('name', '<=', 'Rotisseria Arroz Branco\uf8ff').get();

    if (snapshot.empty) {
        console.log("Not found in WeeklyMenu, trying Recipe_v2");
        const snapshot2 = await db.collection('Recipe_v2').where('name', '>=', 'Rotisseria Arroz Branco').where('name', '<=', 'Rotisseria Arroz Branco\uf8ff').get();

        if (snapshot2.empty) {
            console.log("Not found in Recipe_v2");
            return;
        }
        snapshot2.forEach(doc => {
            console.log(`\n--- RECIPE V2: ${doc.id} ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
        return;
    }

    snapshot.forEach(doc => {
        console.log(`\n--- WEEKLY MENU: ${doc.id} ---`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkRecipe().catch(console.error);
