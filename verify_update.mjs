import { db } from './lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function verify() {
    const boboDoc = await getDoc(doc(db, 'Recipe', 'KriQMHylcZ1xQSLiBdq4'));
    if (boboDoc.exists()) {
        const data = boboDoc.data();
        console.log("Receita:", data.name);
        console.log("Etapas:", data.preparations.length);
        data.preparations.forEach((p, i) => {
            console.log(`Etapa ${i+1}: ${p.title}`);
            console.log(` - Ingredientes: ${p.ingredients.length}`);
            if (p.origin_id) console.log(` - Importa: ${p.origin_id}`);
        });
    } else {
        console.log("❌ Receita não encontrada!");
    }
    process.exit(0);
}

verify().catch(console.error);
