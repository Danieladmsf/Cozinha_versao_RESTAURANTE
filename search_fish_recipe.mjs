import { db } from './lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function searchFishRecipe() {
    console.log("🔍 Buscando 'Tiras de Peixe' no Firestore...");
    const snap = await getDocs(collection(db, 'Recipe'));
    let found = false;
    
    snap.forEach(doc => {
        const name = (doc.data().name || "").toLowerCase();
        if (name.includes('peixe') || name.includes('tira') || name.includes('empanad')) {
            console.log(`✅ Encontrado: ${doc.data().name} (ID: ${doc.id})`);
            found = true;
        }
    });

    if (!found) console.log("❌ Nenhuma receita similar encontrada.");
    process.exit(0);
}

searchFishRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
