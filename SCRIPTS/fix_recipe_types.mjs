/**
 * Script para:
 * 1. Corrigir "ROTISSERIA ARROZ BRANCO BENDITO KG" (type receitas → produtos)
 * 2. Classificar receitas sem tipo: se o nome contém palavras de produto → 'produtos', senão → 'receitas'
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

const app = initializeApp(firebaseConfig, 'fix-all-types');
const db = getFirestore(app);

// Palavras que indicam que é um PRODUTO, não uma receita
const PRODUCT_KEYWORDS = ['BENDITO', 'ROTISSERIA', 'REFEICAO:', 'REFEIÇÃO:', 'MARMITA', 'SKU:', 'ASS.FRANGO', 'ASS.'];

function isProductName(name) {
    const upper = (name || '').toUpperCase();
    return PRODUCT_KEYWORDS.some(kw => upper.includes(kw));
}

async function fixAll() {
    console.log('🔍 Buscando todas as receitas...\n');

    const snapshot = await getDocs(collection(db, 'Recipe'));
    const allRecipes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let fixedCount = 0;

    // 1. Corrigir receitas com type='receitas' que são produtos
    const wrongType = allRecipes.filter(r => r.type === 'receitas' && isProductName(r.name));
    console.log(`⚠️  Receitas com type='receitas' que são produtos: ${wrongType.length}`);
    for (const r of wrongType) {
        await updateDoc(doc(db, 'Recipe', r.id), { type: 'produtos', updatedAt: new Date() });
        console.log(`   ✅ "${r.name}" → type: 'produtos'`);
        fixedCount++;
    }

    // 2. Classificar receitas SEM tipo
    const noType = allRecipes.filter(r => !r.type || r.type === 'undefined');
    console.log(`\n⚠️  Receitas sem tipo definido: ${noType.length}`);

    for (const r of noType) {
        const newType = isProductName(r.name) ? 'produtos' : 'receitas';
        await updateDoc(doc(db, 'Recipe', r.id), { type: newType, updatedAt: new Date() });
        console.log(`   ✅ "${r.name}" → type: '${newType}'`);
        fixedCount++;
    }

    console.log(`\n🎯 Total corrigido: ${fixedCount} receitas.`);
}

fixAll()
    .then(() => { console.log('\n✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
