// Script para listar todas as categorias de POP e suas coleções
// Execute com: node SCRIPTS/list-pop-categories.mjs

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listCategories() {
    console.log('📂 Listando categorias de POPs...\n');

    try {
        const snapshot = await getDocs(collection(db, 'pop_categorias'));

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📁 ${data.nome || docSnap.id}`);
            console.log(`   ID: ${docSnap.id}`);
            console.log(`   Coleção: ${data.colecao || '(não definida)'}`);
            console.log(`   Prefixo: ${data.prefixo || '(não definido)'}`);

            // Contar documentos na coleção
            if (data.colecao) {
                const colSnapshot = await getDocs(collection(db, data.colecao));
                console.log(`   Documentos: ${colSnapshot.size}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

listCategories();
