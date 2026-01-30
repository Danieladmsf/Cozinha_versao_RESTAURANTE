// Script para verificar a estrutura das categorias no Firebase
// Execute com: node scripts/check-categories.mjs

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

async function checkCategories() {
    console.log('📋 Verificando categorias no Firebase...\n');

    try {
        const snapshot = await getDocs(collection(db, 'pop_categorias'));

        if (snapshot.empty) {
            console.log('❌ Nenhuma categoria encontrada!');
            process.exit(0);
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('─'.repeat(50));
            console.log(`📁 Categoria: ${data.nome} (ID: ${doc.id})`);
            console.log(`   Prefixo: ${data.prefixo || 'N/A'}`);
            console.log(`   Coleção: ${data.colecao}`);
            console.log(`   Cor: ${data.corPrimaria}`);
            console.log(`   Ícone: ${data.icone}`);
            console.log(`   Cards (${data.cards?.length || 0}):`);

            if (data.cards && data.cards.length > 0) {
                data.cards.forEach((card, i) => {
                    console.log(`      ${i + 1}. ${card.titulo} (${card.cor}) [${card.icone}]`);
                });
            } else {
                console.log('      ❌ NENHUM CARD!');
            }
        });

        console.log('\n' + '─'.repeat(50));
        console.log('✅ Verificação concluída.');

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

checkCategories();
