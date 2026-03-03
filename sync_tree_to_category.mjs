
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ FORÇANDO SINCRONIZAÇÃO COMPLETA CATEGORY_TREE -> CATEGORY 🛠️\n");

    // 1. Tentar ler tudo de Category (pra gente ver se Firebase deixa)
    const oldSnap = await getDocs(collection(db, 'Category'));
    console.log(`Lendo Category antes da exclusão forçada: ${oldSnap.size} itens.`);
    for (const d of oldSnap.docs) {
        await deleteDoc(doc(db, "Category", d.id));
        console.log(`🗑️ Deletado Forçado: ${d.id}`);
    }

    // 2. Nossa arvore da interface está limpa e correta (27 itens perfeitos)
    const treeSnap = await getDocs(collection(db, 'CategoryTree'));
    console.log(`\nLendo CategoryTree: ${treeSnap.size} itens.`);

    let count = 0;
    for (const treeDoc of treeSnap.docs) {
        const tData = treeDoc.data();

        const newCatData = {
            name: tData.name || 'S/ Nome',
            type: tData.type || 'produtos',
            active: tData.active !== false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Setamos a Categoria Pai Root com o MSM exato ID da árvore
        await setDoc(doc(db, 'Category', treeDoc.id), newCatData);
        console.log(`✅ Category Sincronizada: ${newCatData.name}`);
        count++;
    }

    console.log(`\n🎉 SUUUUCESSO! ${count} Categorias Forçadas Goela Abaixo.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
