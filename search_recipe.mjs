import { db } from './lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function searchRecipe() {
    console.log("🔍 Buscando 'Bobó de Legumes' no Firestore...");
    const snap = await getDocs(collection(db, 'Recipe'));
    let found = false;
    
    snap.forEach(doc => {
        const name = doc.data().name || "";
        if (name.toLowerCase().includes('bobó') || name.toLowerCase().includes('bobo')) {
            console.log(`✅ Encontrado: ${name} (ID: ${doc.id})`);
            found = true;
        }
    });

    if (!found) console.log("❌ Nenhuma receita similar encontrada.");
    process.exit(0);
}

searchRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
