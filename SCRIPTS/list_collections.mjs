import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCvoMkdHB6PlGu9I3Lciqlcd13zYhbHgxY",
    authDomain: "controle-de-estoque-ab42c.firebaseapp.com",
    projectId: "controle-de-estoque-ab42c",
    storageBucket: "controle-de-estoque-ab42c.firebasestorage.app",
    messagingSenderId: "365318581498",
    appId: "1:365318581498:web:48d53c4b40abcc37b25ee6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listCollections() {
    console.log('\n🔍 Listando todas as coleções principais...\n');

    // Collections we know exist from entities.js
    const knownCollections = [
        'WeeklyMenu',
        'MenuConfig',
        'Order',
        'Recipe',
        'Customer',
        'Category',
        'CategoryTree',
        'DailyMenu',
        'Menu'
    ];

    for (const colName of knownCollections) {
        try {
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);
            console.log(`📁 ${colName}: ${snapshot.size} documentos`);

            // Show sample document structure for non-empty collections
            if (snapshot.size > 0 && colName === 'WeeklyMenu') {
                const firstDoc = snapshot.docs[0];
                const data = firstDoc.data();
                console.log(`   Estrutura do primeiro documento:`);
                console.log(`   Keys: ${Object.keys(data).join(', ')}`);

                if (data.days && data.days.length > 0) {
                    console.log(`   Dias no cardápio: ${data.days.map(d => d.date).join(', ')}`);
                }
            }
        } catch (e) {
            console.log(`❌ ${colName}: Erro - ${e.message}`);
        }
    }

    process.exit(0);
}

listCollections();
