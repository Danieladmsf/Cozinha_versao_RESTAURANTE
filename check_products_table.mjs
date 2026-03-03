
import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🔍 CONTANDO PRODUTOS NA TABELA 'PRODUCT' 🔍");

    try {
        const snap = await getDocs(collection(db, 'Product'));
        console.log(`\n Total de Produtos Encontrados: ${snap.size}`);

        let count = 0;
        snap.docs.forEach(d => {
            if (count < 10) {
                const data = d.data();
                console.log(`- ID: ${d.id} | Nome: ${data.name} | CatID: ${data.category_id}`);
            }
            count++;
        });

        if (snap.size > 10) {
            console.log(`... e mais ${snap.size - 10} produtos.`);
        }
    } catch (err) {
        console.error("Erro:", err);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
