/**
 * Script de diagnóstico: listar TODAS as receitas que parecem produtos
 * (têm nomes com "BENDITO", "ROTISSERIA", "MARMITA", "REFEICAO", etc.)
 * e mostrar seus tipos.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'diag-script');
const db = getFirestore(app);

async function diagnose() {
    console.log('🔍 Buscando todas as receitas...\n');

    const snapshot = await getDocs(collection(db, 'Recipe'));
    const allRecipes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Contar por tipo
    const typeCounts = {};
    allRecipes.forEach(r => {
        const t = r.type || '(sem tipo)';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    console.log('📊 Distribuição por tipo:');
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
    });

    // Listar todas que têm type 'receitas' e nome com palavras-chave de produtos
    const productKeywords = ['BENDITO', 'ROTISSERIA', 'REFEICAO', 'REFEIÇÃO', 'MARMITA', 'PATE', 'ASS.'];

    console.log('\n🔎 Receitas com type "receitas" que parecem ser PRODUTOS:');
    const suspects = allRecipes.filter(r => {
        if (r.type !== 'receitas') return false;
        const name = (r.name || '').toUpperCase();
        return productKeywords.some(kw => name.includes(kw));
    });

    if (suspects.length === 0) {
        console.log('   Nenhuma encontrada!\n');
    } else {
        suspects.forEach(r => {
            console.log(`   - [${r.id}] "${r.name}" | type: "${r.type}" | source_product_id: ${r.source_product_id || 'N/A'}`);
        });
    }

    // Buscar especificamente "arroz" 
    console.log('\n🍚 Todas receitas com "arroz" no nome:');
    const arrozRecipes = allRecipes.filter(r => (r.name || '').toLowerCase().includes('arroz'));
    arrozRecipes.forEach(r => {
        console.log(`   - [${r.id}] "${r.name}" | type: "${r.type}" | source_product_id: ${r.source_product_id || 'N/A'} | category: "${r.category || 'N/A'}"`);
    });

    console.log(`\n📊 Total de receitas: ${allRecipes.length}`);
}

diagnose()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err); process.exit(1); });
