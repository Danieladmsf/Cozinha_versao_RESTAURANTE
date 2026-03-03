
import { db } from './lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

async function main() {
    console.log("✏️ PREENCHENDO O CAMPO 'category' NAS RECEITAS COM BASE NO 'category_id' ✏️\n");

    // 1. Carregar mapeamento oficial das categorias (ID -> Nome)
    const catSnap = await getDocs(collection(db, 'Category'));
    const catMap = {};
    catSnap.docs.forEach(d => {
        catMap[d.id] = d.data().name;
    });

    // 2. Carregar todas as receitas
    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let updatedCount = 0;

    for (const d of recipeSnap.docs) {
        const recipe = d.data();
        const catId = recipe.category_id;

        if (catId && catMap[catId]) {
            const correctCategoryName = catMap[catId];

            // Só atualizar se estiver vazio ou diferente
            if (recipe.category !== correctCategoryName) {
                await setDoc(doc(db, "Recipe", d.id), {
                    category: correctCategoryName
                }, { merge: true });

                console.log(`✅ Atualizada: [${recipe.name}] -> Categoria Textual: ${correctCategoryName}`);
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Concluído! ${updatedCount} Receitas tiveram seu texto de categoria corrigido para exibição nos cards.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
