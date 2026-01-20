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

async function checkEmbalagemStructure() {
    console.log("\n📦 === VERIFICANDO ESTRUTURA DAS CATEGORIAS DE EMBALAGEM ===\n");

    const q = query(collection(db, "CategoryTree"), where("type", "==", "embalagens"));
    const snapshot = await getDocs(q);

    console.log(`Total de categorias tipo 'embalagens': ${snapshot.size}\n`);

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`📁 ${data.name}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   parent_id: ${data.parent_id || 'NULL'}`);
        console.log(`   level: ${data.level || 'NULL'}`);
        console.log(`   active: ${data.active}`);
        console.log('');
    });
}

checkEmbalagemStructure().then(() => process.exit(0));
