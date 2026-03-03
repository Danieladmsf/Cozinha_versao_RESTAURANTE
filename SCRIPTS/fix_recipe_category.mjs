import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ CORRIGINDO CAMPO CATEGORY NAS RECEITAS 🛠️");

    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let updatedCount = 0;

    for (const d of recipeSnap.docs) {
        const recipe = d.data();
        if (recipe.category_name && !recipe.category) {
            await setDoc(doc(db, 'Recipe', d.id), {
                category: recipe.category_name
            }, { merge: true });
            updatedCount++;
            console.log(`Corrigido: ${recipe.name} -> ${recipe.category_name}`);
        }
    }

    console.log(`\n🎉 PROCESSO CONCLUÍDO! Receitas corrigidas: ${updatedCount}`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
