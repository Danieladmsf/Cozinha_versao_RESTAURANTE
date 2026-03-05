/**
 * Remove produtos duplicados (sem código VR) que foram criados pelo bug de sync.
 * Identifica duplicatas: mesmo nome, sem code, com recipe_link_id.
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

const app = initializeApp(firebaseConfig, 'cleanup-dupes');
const db = getFirestore(app);

async function cleanup() {
    console.log('🔍 Buscando todos os produtos...\n');

    const snapshot = await getDocs(collection(db, 'Product'));
    const allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Total de produtos: ${allProducts.length}\n`);

    // Agrupar por nome
    const byName = {};
    allProducts.forEach(p => {
        const name = (p.name || '').trim();
        if (!byName[name]) byName[name] = [];
        byName[name].push(p);
    });

    // Encontrar duplicatas (mesmo nome, mais de 1 registro)
    const duplicates = Object.entries(byName).filter(([, prods]) => prods.length > 1);

    console.log(`⚠️  Nomes com duplicatas: ${duplicates.length}\n`);

    let deleted = 0;
    for (const [name, prods] of duplicates) {
        console.log(`\n📦 "${name}" - ${prods.length} registros:`);

        // Manter o que tem código VR (code), remover os sem
        const withCode = prods.filter(p => p.code && String(p.code).trim() !== '');
        const withoutCode = prods.filter(p => !p.code || String(p.code).trim() === '');

        console.log(`   Com código VR: ${withCode.length} | Sem código: ${withoutCode.length}`);

        if (withCode.length > 0 && withoutCode.length > 0) {
            // Remover os sem código (são os duplicados criados pelo bug)
            for (const dup of withoutCode) {
                console.log(`   🗑️  Removendo duplicata: [${dup.id}] (sem código, recipe_link_id: ${dup.recipe_link_id || 'N/A'})`);
                await deleteDoc(doc(db, 'Product', dup.id));
                deleted++;
            }
        } else {
            console.log(`   ⏭️  Pulando (nenhum critério claro para decidir qual manter)`);
        }
    }

    console.log(`\n🎯 ${deleted} produtos duplicados removidos.`);
}

cleanup()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
