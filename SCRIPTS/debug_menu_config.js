// Debug script para verificar categoryGroups no banco de dados
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function debugMenuConfig() {
    console.log('=== DEBUG MENU CONFIG ===\n');

    try {
        // Buscar todas as configurações de menu
        const menuConfigRef = collection(db, 'MenuConfig');
        const snapshot = await getDocs(menuConfigRef);

        console.log(`Total de documentos em MenuConfig: ${snapshot.size}\n`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('--- Documento ID:', doc.id, '---');
            console.log('user_id:', data.user_id);
            console.log('is_default:', data.is_default);
            console.log('\n=== CATEGORY_GROUPS ===');

            if (data.category_groups && Array.isArray(data.category_groups)) {
                data.category_groups.forEach((group, index) => {
                    console.log(`\nGrupo ${index + 1}:`);
                    console.log('  ID:', group.id);
                    console.log('  Nome:', group.name);
                    console.log('  Items (IDs):', group.items);
                    console.log('  Total de items:', group.items?.length || 0);
                });
            } else {
                console.log('category_groups não existe ou não é um array');
                console.log('Valor atual:', data.category_groups);
            }

            console.log('\n=== CATEGORY_ORDER (antigo) ===');
            console.log('category_order:', data.category_order);

            console.log('\n');
        });

        // Também buscar a árvore de categorias para entender os IDs
        console.log('=== CATEGORY_TREE (primeiros 10) ===\n');
        const categoryTreeRef = collection(db, 'CategoryTree');
        const treeSnapshot = await getDocs(categoryTreeRef);

        let count = 0;
        treeSnapshot.forEach(doc => {
            if (count < 10) {
                const data = doc.data();
                console.log(`${data.name} (ID: ${doc.id}, Level: ${data.level}, Parent: ${data.parent_id || 'ROOT'})`);
                count++;
            }
        });

    } catch (error) {
        console.error('Erro:', error);
    }

    process.exit(0);
}

debugMenuConfig();
