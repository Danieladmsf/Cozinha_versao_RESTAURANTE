import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

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

async function createEmbalagemCategory() {
    console.log("\n📦 === CRIANDO CATEGORIA EMBALAGEM ===\n");

    // 1. Verificar se já existe
    const existingQuery = query(
        collection(db, "CategoryTree"),
        where("name", "==", "Embalagem")
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        console.log("⚠️  Categoria 'Embalagem' já existe!");
        existingSnapshot.forEach(doc => {
            console.log(`   ID: ${doc.id}`);
            console.log(`   Dados: ${JSON.stringify(doc.data(), null, 2)}`);
        });
        return;
    }

    // 2. Criar a categoria Embalagem
    const embalagemData = {
        name: "Embalagem",
        type: "receitas_-_base", // Para aparecer em Produtos/Receitas Base
        level: 1,
        parent_id: null,
        order: 100, // Ordem alta para ficar no final
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "CategoryTree"), embalagemData);
    console.log("✅ Categoria 'Embalagem' criada com sucesso!");
    console.log(`   ID: ${docRef.id}`);
    console.log(`   Dados: ${JSON.stringify(embalagemData, null, 2)}`);
}

async function main() {
    await createEmbalagemCategory();
    process.exit(0);
}

main().catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
