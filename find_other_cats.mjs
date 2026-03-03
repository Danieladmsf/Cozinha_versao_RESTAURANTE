
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    const catsToFind = [
        'MONO ARROZ (ALMOÇO)',
        'MONO FEIJÃO (ALMOÇO)',
        'MONO GUARNIÇÃO (ALMOÇO)',
        'MONO PROTEINAS (ALMOÇO)',
        'MASSAS (TARDE)'
    ];

    console.log("🛠️ Pesquisando nestas categorias:", catsToFind);

    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    console.log("\n===> COLEÇÃO RECIPE (O que o Cardápio lê)");
    let recCount = 0;
    recSnap.forEach(r => {
        const data = r.data();
        if (catsToFind.includes(data.category)) {
            console.log(`[Recipe] Name: ${data.name} | Cat: ${data.category}`);
            recCount++;
        }
    });
    if (recCount === 0) console.log("Nenhum item encontrado!");

    const prodSnap = await getDocsFromServer(collection(db, "Product"));
    console.log("\n===> COLEÇÃO PRODUCT (Itens legados/fantasmas)");
    let prodCount = 0;
    prodSnap.forEach(p => {
        const data = p.data();
        if (catsToFind.includes(data.category)) {
            console.log(`[Product] Name: ${data.name} | Cat: ${data.category}`);
            prodCount++;
        }
    });
    if (prodCount === 0) console.log("Nenhum item encontrado!");

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
