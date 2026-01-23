
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function moveCakesToProdutos() {
    console.log("🚚 Moving 'Padaria' and 'Confeitaria' to 'Produtos' (type: receitas_-_base)...");

    try {
        // 1. Find 'Padaria'
        const qPadaria = query(collection(db, "Category"), where("name", "==", "Padaria"));
        const snapPadaria = await getDocs(qPadaria);

        if (!snapPadaria.empty) {
            for (const docSnap of snapPadaria.docs) {
                await updateDoc(doc(db, "Category", docSnap.id), {
                    type: 'receitas_-_base', // Maps to "Produtos"
                    updatedAt: Timestamp.now()
                });
                console.log(`✅ Updated 'Padaria' (ID: ${docSnap.id}) type -> 'receitas_-_base'`);
            }
        } else {
            console.warn("⚠️ 'Padaria' category not found!");
        }

        // 2. Find 'Confeitaria'
        const qConfeitaria = query(collection(db, "Category"), where("name", "==", "Confeitaria"));
        const snapConfeitaria = await getDocs(qConfeitaria);

        if (!snapConfeitaria.empty) {
            for (const docSnap of snapConfeitaria.docs) {
                await updateDoc(doc(db, "Category", docSnap.id), {
                    type: 'receitas_-_base',
                    updatedAt: Timestamp.now()
                });
                console.log(`✅ Updated 'Confeitaria' (ID: ${docSnap.id}) type -> 'receitas_-_base'`);
            }
        } else {
            console.warn("⚠️ 'Confeitaria' category not found!");
        }

        console.log("🎉 Categories moved to 'Produtos' section!");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

moveCakesToProdutos();
