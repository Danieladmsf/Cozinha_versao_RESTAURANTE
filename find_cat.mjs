
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Procurando a categoria de Macarrão...");
    const snap = await getDocsFromServer(collection(db, "CategoryTree"));

    let macarraoCatId = null;
    snap.forEach(d => {
        const data = d.data();
        if (data.name === 'MACARRÃO (ALMOÇO)') {
            macarraoCatId = d.id;
        }
    });

    console.log(`MACARRÃO (ALMOÇO) Category ID: ${macarraoCatId}`);
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
