import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

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

async function createEmbalagensCategoryType() {
    console.log("\n📦 === CRIANDO TIPO DE CATEGORIA EMBALAGENS ===\n");

    // 1. Verificar se já existe o tipo "embalagens"
    const existingQuery = query(
        collection(db, "CategoryType"),
        where("value", "==", "embalagens")
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        console.log("⚠️  Tipo de categoria 'embalagens' já existe!");
        existingSnapshot.forEach(doc => {
            console.log(`   ID: ${doc.id}`);
            console.log(`   Dados: ${JSON.stringify(doc.data(), null, 2)}`);
        });
        return;
    }

    // 2. Criar o novo tipo de categoria "Embalagens"
    const embalagensCategoryType = {
        label: "Embalagens",
        value: "embalagens",
        order: 5, // Após Produtos (order 4)
        is_system: true, // Nativo do sistema
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, "CategoryType"), embalagensCategoryType);
    console.log("✅ Tipo de categoria 'Embalagens' criado com sucesso!");
    console.log(`   ID: ${docRef.id}`);
    console.log(`   Dados: ${JSON.stringify(embalagensCategoryType, null, 2)}`);

    // 3. Agora precisamos atualizar as categorias existentes de Embalagem para o novo tipo
    console.log("\n🔄 Atualizando categorias existentes de Embalagem...\n");

    // Buscar categoria Embalagem atual (que está em receitas_-_base)
    const embCatQuery = query(
        collection(db, "CategoryTree"),
        where("name", "==", "Embalagem")
    );
    const embCatSnapshot = await getDocs(embCatQuery);

    for (const embDoc of embCatSnapshot.docs) {
        const embData = embDoc.data();
        console.log(`   Encontrado: ${embData.name} (type: ${embData.type})`);

        // Atualizar para o novo tipo "embalagens"
        await updateDoc(doc(db, "CategoryTree", embDoc.id), {
            type: "embalagens",
            updatedAt: new Date()
        });
        console.log(`   ✅ Atualizado para type: "embalagens"`);

        // Buscar e atualizar subcategorias (Isopor, Plástico)
        const subCatQuery = query(
            collection(db, "CategoryTree"),
            where("parent_id", "==", embDoc.id)
        );
        const subCatSnapshot = await getDocs(subCatQuery);

        for (const subDoc of subCatSnapshot.docs) {
            const subData = subDoc.data();
            console.log(`   → Subcategoria: ${subData.name}`);

            await updateDoc(doc(db, "CategoryTree", subDoc.id), {
                type: "embalagens",
                updatedAt: new Date()
            });
            console.log(`     ✅ Atualizado para type: "embalagens"`);
        }
    }

    console.log("\n🎉 Concluído! A aba 'Embalagens' está pronta.");
}

async function main() {
    await createEmbalagensCategoryType();
    process.exit(0);
}

main().catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
