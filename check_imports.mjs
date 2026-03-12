import { db } from './lib/firebase.js';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

async function checkImports() {
    console.log("--- Buscando Receitas que usam origin_id ---");
    const snap = await getDocs(collection(db, 'Recipe'));
    let found = 0;
    snap.forEach(doc => {
        const preps = doc.data().preparations || [];
        preps.forEach(p => {
            if (p.origin_id && found < 5) {
                console.log(`✅ Receita: ${doc.data().name} (Type: ${doc.data().type})`);
                console.log(`   - Etapa: ${p.title} (origin_id: ${p.origin_id})`);
                found++;
            }
        });
    });
    process.exit(0);
}

checkImports().catch(console.error);
