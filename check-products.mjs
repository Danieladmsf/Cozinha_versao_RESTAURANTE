
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    const snap = await getDocsFromServer(collection(db, "Product"));
    let inativos = 0;

    snap.forEach(d => {
        if (d.data().active === false) inativos++;
    });

    console.log(`Produtos totais: ${snap.size}`);
    console.log(`Produtos inativos (active=false): ${inativos}`);

    // Check root categories for active status
    const treeSnap = await getDocsFromServer(collection(db, "CategoryTree"));
    let inativasTree = [];
    treeSnap.forEach(d => {
        if (d.data().type === 'produtos' && d.data().active === false) {
            inativasTree.push(d.data().name);
        }
    });
    console.log(`Categorias de produtos inativas na Tree: ${inativasTree.join(', ')}`);

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
