import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ FORÇANDO A SOBRESCRITA DA CATEGORIA EM TEXTO 🛠️");

    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let updatedCount = 0;

    for (const d of recipeSnap.docs) {
        const recipe = d.data();

        // Se a gente gravou category_name no script de importação,
        // vamos forçar o overwrite no campo `category` que é o que a UI lê.
        if (recipe.category_name && recipe.category !== recipe.category_name) {
            await setDoc(doc(db, 'Recipe', d.id), {
                category: recipe.category_name
            }, { merge: true });

            updatedCount++;
            console.log(`Corrigido: ${recipe.name} | De: '${recipe.category}' Para: '${recipe.category_name}'`);
        }
    }

    console.log(`\n🎉 PROCESSO CONCLUÍDO! Receitas com o texto corrigido: ${updatedCount}`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
