import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Configuração do Firebase
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

async function listCategoryTypes() {
    console.log("\n📋 === LISTANDO CategoryType ===\n");

    const snapshot = await getDocs(collection(db, "CategoryType"));
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(`Dados:`, JSON.stringify(doc.data(), null, 2));
        console.log("---");
    });

    console.log(`\nTotal: ${snapshot.size} registros`);
}

async function listCategoryTree() {
    console.log("\n📋 === LISTANDO CategoryTree (Level 1) ===\n");

    const snapshot = await getDocs(collection(db, "CategoryTree"));
    const level1 = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.level === 1 || !data.parent_id) {
            level1.push({ id: doc.id, ...data });
        }
    });

    // Agrupar por type
    const byType = {};
    level1.forEach(cat => {
        const type = cat.type || 'sem_tipo';
        if (!byType[type]) byType[type] = [];
        byType[type].push(cat);
    });

    for (const [type, cats] of Object.entries(byType)) {
        console.log(`\n🏷️  Tipo: "${type}"`);
        cats.forEach(cat => {
            console.log(`   - ${cat.name} (id: ${cat.id})`);
        });
    }

    console.log(`\nTotal Level 1: ${level1.length} registros`);
}

async function main() {
    await listCategoryTypes();
    await listCategoryTree();
    process.exit(0);
}

main().catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
