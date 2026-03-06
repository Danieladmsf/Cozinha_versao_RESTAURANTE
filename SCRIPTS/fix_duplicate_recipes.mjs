/**
 * Diagnosticar e remover receitas duplicadas.
 * Identifica Recipes com mesmo nome e mantém apenas a mais completa.
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

const app = initializeApp(firebaseConfig, 'fix-dupes');
const db = getFirestore(app);

function getRecipeScore(recipe) {
    let score = 0;
    if (recipe.ingredients && recipe.ingredients.length > 0) score += 10;
    if (recipe.preparations && recipe.preparations.length > 0) score += 10;
    if (recipe.total_cost && recipe.total_cost > 0) score += 5;
    if (recipe.total_weight && recipe.total_weight > 0) score += 5;
    if (recipe.source_product_id) score += 2;
    if (recipe.category) score += 1;
    // Older recipes (with data) are likely the original
    if (recipe.createdAt && recipe.createdAt.toDate) {
        // Older = better (original)
        score += 1;
    }
    return score;
}

async function run() {
    console.log('🔍 Buscando todas as receitas...\n');

    const snap = await getDocs(collection(db, 'Recipe'));
    const recipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Total: ${recipes.length} receitas\n`);

    // Agrupar por nome (normalizado)
    const byName = {};
    recipes.forEach(r => {
        const key = (r.name || '').trim().toLowerCase();
        if (!byName[key]) byName[key] = [];
        byName[key].push(r);
    });

    // Encontrar duplicatas
    const duplicateGroups = Object.entries(byName).filter(([, group]) => group.length > 1);

    console.log(`⚠️  ${duplicateGroups.length} nomes com duplicatas:\n`);

    let totalDeleted = 0;

    for (const [name, group] of duplicateGroups) {
        // Ordenar por score (mais completa primeiro)
        group.sort((a, b) => getRecipeScore(b) - getRecipeScore(a));

        const keep = group[0];
        const toDelete = group.slice(1);

        console.log(`  "${name}" → ${group.length} cópias`);
        console.log(`    ✅ MANTER: ${keep.id} (score: ${getRecipeScore(keep)}, type: ${keep.type})`);

        for (const dup of toDelete) {
            console.log(`    🗑️  DELETAR: ${dup.id} (score: ${getRecipeScore(dup)}, type: ${dup.type})`);
            await deleteDoc(doc(db, 'Recipe', dup.id));
            totalDeleted++;
        }
    }

    console.log(`\n🎯 Resultado: ${totalDeleted} duplicatas removidas.`);
}

run()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
