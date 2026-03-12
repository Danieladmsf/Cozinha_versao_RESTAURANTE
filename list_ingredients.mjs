import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function listIngredients() {
    console.log("--- Listando Primeiros 50 Ingredientes ---");
    const snap = await getDocs(collection(db, 'Ingredients'));
    let count = 0;
    snap.forEach(doc => {
        if (count < 100) {
            console.log(`✅ ${doc.data().name} (ID: ${doc.id})`);
            count++;
        }
    });
    process.exit(0);
}

listIngredients().catch(console.error);
