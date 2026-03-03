
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Procurando por Polpetone...");
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));

    recSnap.forEach(r => {
        const data = r.data();
        if (data.name && data.name.toLowerCase().includes('polpetone')) {
            console.log(`[Recipe] ID: ${r.id} | Name: ${data.name} | Cat: ${data.category}`);
        }
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
