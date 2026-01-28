
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listCustomers() {
    console.log('🔍 Buscando clientes...');
    const snapshot = await getDocs(collection(db, 'Customer'));

    if (snapshot.empty) {
        console.log('❌ Nenhum cliente encontrado.');
    } else {
        console.log(`✅ ${snapshot.size} Cliente(s) encontrado(s):`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   🆔 ${doc.id} - 👤 ${data.name || data.commercial_name || 'Sem Nome'}`);
        });
    }
    process.exit(0);
}

listCustomers();
