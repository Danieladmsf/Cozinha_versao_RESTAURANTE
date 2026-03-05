/**
 * Script para corrigir o type das receitas que foram auto-criadas de produtos.
 * 
 * Problema: Receitas criadas com source_product_id estão com type 'receitas'
 * quando deveriam ter type 'produtos'.
 * 
 * Uso: node SCRIPTS/fix_recipe_types.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'fix-types-script');
const db = getFirestore(app);

async function fixRecipeTypes() {
    console.log('🔍 Buscando todas as receitas...');

    const snapshot = await getDocs(collection(db, 'Recipe'));
    const allRecipes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Total de receitas no banco: ${allRecipes.length}`);

    // Encontrar receitas que foram criadas de produtos (têm source_product_id)
    const productRecipes = allRecipes.filter(r => r.source_product_id);
    console.log(`🔗 Receitas com source_product_id: ${productRecipes.length}`);

    // Filtrar as que estão com type errado
    const toFix = productRecipes.filter(r => r.type !== 'produtos');
    console.log(`⚠️  Receitas para corrigir (type != 'produtos'): ${toFix.length}`);

    if (toFix.length === 0) {
        console.log('✅ Nenhuma correção necessária!');
        return;
    }

    console.log('\n📝 Receitas que serão corrigidas:');
    toFix.forEach(r => {
        console.log(`   - [${r.id}] "${r.name}" | type atual: "${r.type}" → será: "produtos"`);
    });

    // Aplicar correções
    let fixed = 0;
    for (const recipe of toFix) {
        try {
            await updateDoc(doc(db, 'Recipe', recipe.id), {
                type: 'produtos',
                updatedAt: new Date()
            });
            fixed++;
            console.log(`   ✅ Corrigido: "${recipe.name}"`);
        } catch (err) {
            console.error(`   ❌ Erro ao corrigir "${recipe.name}":`, err.message);
        }
    }

    console.log(`\n🎯 Resultado: ${fixed}/${toFix.length} receitas corrigidas.`);
}

fixRecipeTypes()
    .then(() => {
        console.log('\n✅ Script finalizado.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erro fatal:', err);
        process.exit(1);
    });
