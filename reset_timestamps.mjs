
import { db } from './lib/firebase.js';
import { collection, doc, getDocsFromServer, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("⏱️ ATUALIZANDO TODAS AS DATAS PARA 'AGORA'...");

    // 1. Atualizar Tabela Category
    const snapCat = await getDocsFromServer(collection(db, 'Category'));
    let countCat = 0;
    for (const d of snapCat.docs) {
        await setDoc(doc(db, "Category", d.id), {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        countCat++;
    }
    console.log(`✅ ${countCat} Categorias atualizadas para a data de hoje.`);

    // 2. Atualizar Tabela CategoryTree
    const snapTree = await getDocsFromServer(collection(db, 'CategoryTree'));
    let countTree = 0;
    for (const d of snapTree.docs) {
        await setDoc(doc(db, "CategoryTree", d.id), {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        countTree++;
    }
    console.log(`✅ ${countTree} Árvores atualizadas para a data de hoje.`);

    // 3. Atualizar Tabela CategoryType (só pra garantir)
    const snapType = await getDocsFromServer(collection(db, 'CategoryType'));
    let countType = 0;
    for (const d of snapType.docs) {
        await setDoc(doc(db, "CategoryType", d.id), {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        countType++;
    }
    console.log(`✅ ${countType} Tipos Mestres atualizados para a data de hoje.`);

    console.log("\n🎉 RELÓGIOS ZERADOS! TUDO COM DATA DE HOJE!");
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
