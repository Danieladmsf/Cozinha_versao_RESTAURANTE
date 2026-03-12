import { db } from './lib/firebase.js';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

async function research() {
    console.log("--- Buscando Ingredientes (Coleção 'Ingredient') ---");
    const ingredientsToFind = [
        "Abobrinha", "Cenoura", "Pimentão", "Cebola", "Tomate", "Azeite", 
        "Creme de Leite", "Leite de Coco"
    ];
    
    for (const name of ingredientsToFind) {
        const snap = await getDocs(collection(db, 'Ingredient'));
        let found = false;
        snap.forEach(d => {
            const dName = d.data().name || "";
            if (dName.toLowerCase().includes(name.toLowerCase())) {
                console.log(`✅ Ingrediente: ${dName} (ID: ${d.id})`);
                found = true;
            }
        });
        if (!found) console.log(`❌ Não encontrado: ${name}`);
    }

    console.log("\n--- Buscando Receita 'Molho de Tomate' ---");
    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    recipeSnap.forEach(d => {
        const rName = d.data().name || "";
        if (rName.toLowerCase().includes('molho de tomate')) {
            console.log(`✅ Receita: ${rName} (ID: ${d.id})`);
        }
    });

    process.exit(0);
}

research().catch(console.error);
