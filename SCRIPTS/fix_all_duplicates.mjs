/**
 * Diagnosticar e limpar duplicatas em TODAS as coleções relevantes.
 * Product, Recipe, Ingredient, WeeklyMenu, etc.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'fix-all-dupes');
const db = getFirestore(app);

function getDocScore(d) {
    let score = 0;
    const keys = Object.keys(d);
    // More fields = more complete
    score += keys.length;
    // Has meaningful data
    if (d.ingredients && d.ingredients.length > 0) score += 20;
    if (d.preparations && d.preparations.length > 0) score += 20;
    if (d.components && d.components.length > 0) score += 10;
    if (d.total_cost && d.total_cost > 0) score += 10;
    if (d.price && d.price > 0) score += 10;
    if (d.category) score += 5;
    if (d.code) score += 3;
    if (d.recipe_link_id) score += 5;
    if (d.source_product_id) score += 5;
    return score;
}

async function fixCollection(collectionName, nameField = 'name') {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📦 ${collectionName}`);
    console.log('═'.repeat(50));

    const snap = await getDocs(collection(db, collectionName));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`   Total: ${docs.length} documentos`);

    // Agrupar por nome
    const byName = {};
    docs.forEach(d => {
        const name = (d[nameField] || '').trim().toLowerCase();
        if (!name) return;
        if (!byName[name]) byName[name] = [];
        byName[name].push(d);
    });

    const dupeGroups = Object.entries(byName).filter(([, g]) => g.length > 1);

    if (dupeGroups.length === 0) {
        console.log(`   ✅ Sem duplicatas!`);
        return 0;
    }

    console.log(`   ⚠️  ${dupeGroups.length} nomes com duplicatas:\n`);

    let deleted = 0;

    for (const [name, group] of dupeGroups) {
        group.sort((a, b) => getDocScore(b) - getDocScore(a));

        const keep = group[0];
        const toDelete = group.slice(1);

        console.log(`   "${name}" → ${group.length}x`);
        console.log(`     ✅ MANTER: ${keep.id} (score: ${getDocScore(keep)})`);

        for (const dup of toDelete) {
            console.log(`     🗑️  DELETAR: ${dup.id} (score: ${getDocScore(dup)})`);
            await deleteDoc(doc(db, collectionName, dup.id));
            deleted++;
        }
    }

    console.log(`\n   🎯 ${deleted} duplicatas removidas de ${collectionName}`);
    return deleted;
}

async function run() {
    console.log('🔍 Verificando duplicatas em todas as coleções...');

    let total = 0;
    total += await fixCollection('Product');
    total += await fixCollection('Recipe');
    total += await fixCollection('Ingredient');

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🏁 TOTAL: ${total} duplicatas removidas em todas as coleções.`);
}

run()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
