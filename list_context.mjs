import { db } from './lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function listContext() {
    console.log("🔍 Buscando context para novo ingrediente...");
    
    console.log("\n--- Categorias (ingredient) ---");
    const catSnap = await getDocs(query(collection(db, 'Category'), where('type', '==', 'ingredient')));
    catSnap.forEach(doc => console.log(`- ${doc.data().name} (ID: ${doc.id})`));

    console.log("\n--- Fornecedores ---");
    const supSnap = await getDocs(collection(db, 'Supplier'));
    supSnap.forEach(doc => console.log(`- ${doc.data().company_name} (ID: ${doc.id})`));

    console.log("\n--- Marcas ---");
    const brandSnap = await getDocs(collection(db, 'Brand'));
    brandSnap.forEach(doc => console.log(`- ${doc.data().name} (ID: ${doc.id})`));

    process.exit(0);
}

listContext().catch(err => {
    console.error(err);
    process.exit(1);
});
