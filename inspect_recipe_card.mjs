
import { db } from './lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function main() {
    try {
        console.log("🔍 BUSCANDO A RECEITA 'Copa Lombo Acebolado' 🔍\n");
        const q = query(collection(db, 'Recipe'), where('name', '==', 'Copa Lombo Acebolado'));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("Receita não encontrada.");
        } else {
            snap.forEach(d => {
                console.log(`Document ID: ${d.id}`);
                console.log(JSON.stringify(d.data(), null, 2));
            });
        }
    } catch (err) {
        console.error("Erro na leitura:", err);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
