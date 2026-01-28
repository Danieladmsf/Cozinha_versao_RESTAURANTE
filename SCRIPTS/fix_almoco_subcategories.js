import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, addDoc } from "firebase/firestore";

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

// Subcategorias que devem estar dentro de "Almoço"
const ALMOCO_SUBCATEGORIES = [
    "MARMITA 3 DIVISORIAS",
    "MACARRÃO",
    "MONO ARROZ",
    "MONO FEIJÃO",
    "MONO GUARNIÇÃO",
    "MONO PROTEINAS",
    "SALADAS COZIDAS"
];

async function main() {
    console.log("\n🔧 === CORRIGINDO SUBCATEGORIAS DO ALMOÇO ===\n");

    // 1. Primeiro, vamos ver TODAS as categorias para entender a estrutura
    console.log("📋 Listando todas as categorias...\n");
    const allCats = await getDocs(collection(db, "CategoryTree"));

    let almocoId = null;
    let almocoData = null;
    const subcatsToDelete = [];

    allCats.forEach(docSnap => {
        const data = docSnap.data();
        console.log(`  📁 ${data.name} (ID: ${docSnap.id}, parent: ${data.parent_id || 'ROOT'}, level: ${data.level || 0})`);

        // Encontrar Almoço
        if (data.name === "Almoço") {
            almocoId = docSnap.id;
            almocoData = data;
            console.log(`     ⭐ ESTA É A CATEGORIA ALMOÇO!`);
        }

        // Marcar subcategorias para deletar (estão no lugar errado)
        if (ALMOCO_SUBCATEGORIES.includes(data.name)) {
            subcatsToDelete.push({ id: docSnap.id, name: data.name, parent_id: data.parent_id });
            console.log(`     ⚠️  SUBCATEGORIA PARA CORRIGIR`);
        }
    });

    if (!almocoId) {
        console.log("\n❌ Categoria 'Almoço' não encontrada!");
        return;
    }

    console.log(`\n✅ Categoria Almoço encontrada: ${almocoId}`);
    console.log(`   Dados: ${JSON.stringify(almocoData, null, 2)}`);

    // 2. Deletar subcategorias que estão no lugar errado
    console.log(`\n🗑️  Deletando ${subcatsToDelete.length} subcategorias mal posicionadas...\n`);

    for (const subcat of subcatsToDelete) {
        console.log(`   Deletando: ${subcat.name} (ID: ${subcat.id}, parent atual: ${subcat.parent_id})`);
        await deleteDoc(doc(db, "CategoryTree", subcat.id));
        console.log(`   ✅ Deletado`);
    }

    // 3. Recriar subcategorias DENTRO do Almoço
    console.log(`\n📁 Criando subcategorias dentro de 'Almoço' (ID: ${almocoId})...\n`);

    for (let i = 0; i < ALMOCO_SUBCATEGORIES.length; i++) {
        const subcatName = ALMOCO_SUBCATEGORIES[i];

        const subcategoryData = {
            name: subcatName,
            parent_id: almocoId,  // CORRETO: dentro do Almoço
            type: almocoData.type || "cardapio",
            level: (almocoData.level || 0) + 1,  // Um nível abaixo do Almoço
            order: i + 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await addDoc(collection(db, "CategoryTree"), subcategoryData);
        console.log(`   ✅ ${subcatName} (ID: ${docRef.id}, parent: ${almocoId})`);
    }

    console.log("\n🎉 Correção concluída! Recarregue a página para ver as mudanças.");
}

main().then(() => process.exit(0)).catch(err => {
    console.error("❌ Erro:", err);
    process.exit(1);
});
