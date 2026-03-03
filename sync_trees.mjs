
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Limpando Árvores Antigas (CategoryTree e CategoryType)...");

    const toDelete = ['CategoryTree', 'CategoryType'];
    for (const col of toDelete) {
        const snap = await getDocsFromServer(collection(db, col));
        let count = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, col, d.id));
            count++;
        }
        console.log(`🧹 Limpos ${count} documentos de ${col}.`);
    }

    console.log("\n🌱 Sincronizando novas Árvores Oficiais com o DB (Clone da Tabela Category)...");

    // Buscamos as Categorias limpadas que nós mesmos criamos no script anterior!
    const officialCats = await getDocsFromServer(collection(db, 'Category'));

    let createdCount = 0;

    // Recriamos uma CategoryTree IDENTICA para cada uma (muitos frontends antigos precisam disso)
    for (const d of officialCats.docs) {
        const catData = d.data();

        const newTreeData = {
            name: catData.name,
            active: true,
            type: catData.type,     // "receitas" ou "produtos"
            parent_id: null,        // Nível Base Master
            order: createdCount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Salvamos usando o exato MESMO ID do pai (Garante match perfeito no frontend!)
        await setDoc(doc(db, "CategoryTree", d.id), newTreeData);

        // Garantimos que o 'Type' mestre existe também (Pois o DB antigo mapeava por Types tb)
        await setDoc(doc(db, "CategoryType", catData.type), { // "receitas" ou "produtos"
            name: catData.type === 'receitas' ? 'Receitas' : 'Produtos',
            active: true,
            description: `Tipo Mestre: ${catData.type}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        createdCount++;
    }

    console.log(`\n🎉 SUCESSO!`);
    console.log(`✅ ${createdCount} CategoryTrees recriadas! (Totalmente Sincronizadas com as Oficiais)`);
    console.log(`✅ CategoryTypes Mestre [receitas] e [produtos] reconstruídos!`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
