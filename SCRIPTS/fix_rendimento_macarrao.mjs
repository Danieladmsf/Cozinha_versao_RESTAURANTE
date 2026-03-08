import { db } from '../lib/firebase.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const fixes = [
    { id: '2bfsb83E3Q27GtPJkXX3', name: 'Espaguete à Bolonhesa', pastaCooked: '4.0000', waterCooked: '0' },
    { id: 'ajU0r6C4ko62arogtFbH', name: 'Macarronada à Bolonhesa', pastaCooked: '5.0000', waterCooked: '0' }
];

async function main() {
    for (const fix of fixes) {
        const snap = await getDoc(doc(db, 'Recipe', fix.id));
        const data = snap.data();
        console.log('--- ' + fix.name + ' ---');

        const preps = JSON.parse(JSON.stringify(data.preparations));
        const stage0 = preps[0];

        stage0.ingredients = stage0.ingredients.map(ing => {
            const n = (ing.name || '').toLowerCase();
            if (n.includes('espaguete') || n.includes('macarr')) {
                console.log('  FIX ' + ing.name + ': cooked ' + ing.weight_cooked + ' -> ' + fix.pastaCooked);
                return { ...ing, weight_cooked: fix.pastaCooked };
            }
            if (n === 'água' || n === 'agua') {
                console.log('  FIX ' + ing.name + ': cooked ' + ing.weight_cooked + ' -> ' + fix.waterCooked);
                return { ...ing, weight_cooked: fix.waterCooked };
            }
            return ing;
        });

        await updateDoc(doc(db, 'Recipe', fix.id), {
            preparations: preps,
            updatedAt: serverTimestamp()
        });
        console.log('  ✅ Corrigida!\n');
    }

    console.log('🎉 Rendimentos corrigidos com sucesso!');
    setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error(e); process.exit(1); });
