
import { db } from './lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ CORRIGINDO O TIPO DE ITEM NOS PRODUTOS PARA APARECEREM NA TELA 🛠️");

    // Vamos pegar o ID mestre da categoria de Produtos que criamos hoje (para eles aparecerem em PRODUTOS na tela provisoriamente)
    const catSnap = await getDocs(collection(db, 'Category'));
    let produtosMasterId = null;

    catSnap.docs.forEach(d => {
        if (d.data().name === 'PRODUTOS' && d.data().type === 'produtos') {
            produtosMasterId = d.id;
        }
    });

    if (!produtosMasterId) {
        console.log("Categoria mestre 'PRODUTOS' não encontrada! Abortando...");
        process.exit(1);
    }

    const snap = await getDocs(collection(db, 'Product'));
    let count = 0;

    for (const d of snap.docs) {
        // O card vai exibir baseado na categoria texto
        await setDoc(doc(db, "Product", d.id), {
            category_id: produtosMasterId,
            category: "PRODUTOS"
        }, { merge: true });
        count++;
    }

    console.log(`\n🎉 Corrigidos ${count} SKUs! Agora eles pertencem à aba de Produtos oficial.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
