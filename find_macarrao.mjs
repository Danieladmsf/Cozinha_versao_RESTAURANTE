
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Procurando por itens de Macarrão nas coleções...");

    // Check Recipes
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    let recCount = 0;
    recSnap.forEach(r => {
        const data = r.data();
        if (data.name && data.name.toLowerCase().includes('macarrao')) {
            console.log(`[Recipe] ${data.name} | Cat: ${data.category} | Type: ${data.type}`);
            recCount++;
        }
    });

    // Check Products
    const prodSnap = await getDocsFromServer(collection(db, "Product"));
    let prodCount = 0;
    prodSnap.forEach(p => {
        const data = p.data();
        if (data.name && data.name.toLowerCase().includes('macarrao')) {
            console.log(`[Product] ${data.name} | Cat: ${data.category} | Type: ${data.type}`);
            prodCount++;
        }
    });

    console.log(`\nEncontrados: ${recCount} em Recipe | ${prodCount} em Product`);
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
