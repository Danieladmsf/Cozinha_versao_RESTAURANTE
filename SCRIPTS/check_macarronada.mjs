import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function check() {
    const q = query(collection(db, 'Recipe'), where('name', '==', 'Macarronada à Bolonhesa'));
    const qs = await getDocs(q);
    if (qs.empty) { console.log('Recipe not found'); return; }
    const data = qs.docs[0].data();
    console.log('--- Macarronada à Bolonhesa ---');
    data.preparations?.forEach((p, idx) => {
        console.log(`\nEtapa ${idx + 1}: ${p.title}`);
        if (p.ingredients) {
            p.ingredients.forEach(i => {
                console.log(`  Ing: ${i.name} | Raw: ${i.weight_raw} | Clean: ${i.weight_clean} | Pre: ${i.weight_pre_cooking} | Cooked: ${i.weight_cooked} | QTY: ${i.quantity}`);
            });
        }
        if (p.sub_components) {
            p.sub_components.forEach(sc => {
                console.log(`  Montagem: ${sc.name} | Peso Entrada: ${sc.input_yield_weight} | Peso Final: ${sc.weight_portioned}`);
            });
        }
    });
}
check().then(() => process.exit(0)).catch(console.error);
