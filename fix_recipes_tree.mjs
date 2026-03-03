
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, getDocsFromServer, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ INJETANDO AS RECEITAS NA CATEGORY TREE...");

    const snap = await getDocsFromServer(collection(db, 'Category'));
    let count = 0;

    for (const d of snap.docs) {
        const cat = d.data();
        if (cat.type === 'receitas') {
            const treeData = {
                name: cat.name,
                active: cat.active !== false,
                type: 'receitas',
                parent_id: null,
                level: 1,
                order: count + 1,
                createdAt: cat.createdAt || serverTimestamp(),
                updatedAt: cat.updatedAt || serverTimestamp()
            };

            await setDoc(doc(db, "CategoryTree", d.id), treeData);
            console.log(`✅ Injetado: ${cat.name} (level 1)`);
            count++;
        }
    }

    console.log(`\n🎉 ${count} Receitas recriadas na Árvore.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
