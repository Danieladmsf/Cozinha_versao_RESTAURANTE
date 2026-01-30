// Script para remover categorias 'cortes' e 'avisos_sanitarios'
// Execute com: node scripts/delete-legacy-categories.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteLegacyCategories() {
    console.log('🗑️ Removendo categorias Cortes e Avisos Sanitários...\n');

    try {
        await deleteDoc(doc(db, 'pop_categorias', 'cortes'));
        console.log('✅ Categoria "Cortes" removida.');

        await deleteDoc(doc(db, 'pop_categorias', 'avisos_sanitarios'));
        console.log('✅ Categoria "Avisos Sanitários" removida.');

    } catch (error) {
        console.error('❌ Erro ao remover categorias:', error);
    }

    console.log('\n🎉 Concluído! Apenas "Ferramentas" e novas categorias permanecerão.');
    process.exit(0);
}

deleteLegacyCategories();
