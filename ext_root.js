import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function extract() {
    const snap = await getDocs(collection(db, 'Recipe'));
    const targetRecipe = [];
    snap.forEach(d => { if (d.id === 'rec_aIXPh3rOFfABBbpiOSMM_1772574279426') targetRecipe.push(d.data()) });
    const doc = targetRecipe[0];
    delete doc.preparations;
    console.log(JSON.stringify(doc, null, 2));
}

extract().then(() => process.exit(0)).catch(console.error);
