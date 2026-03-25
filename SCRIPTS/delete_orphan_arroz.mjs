import { db } from '../lib/firebase.js';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';

const ORPHAN_ID = '97aLEH4kmKHhFusa1aKQ';

async function run() {
    const ref = doc(db, 'Ingredient', ORPHAN_ID);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
        console.log('❌ Ingrediente não encontrado!');
        process.exit(1);
    }

    const data = snap.data();
    console.log(`Removendo ingrediente órfão: "${data.name}" (ID: ${ORPHAN_ID})`);
    
    await deleteDoc(ref);
    console.log('✅ Ingrediente "Arroz Branco Tipo 1" removido com sucesso do Firebase!');
    
    process.exit(0);
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });
