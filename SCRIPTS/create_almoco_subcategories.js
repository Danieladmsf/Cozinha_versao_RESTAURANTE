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

// Subcategorias a serem criadas dentro de "Almoço"
const ALMOCO_SUBCATEGORIES = [
    "MARMITA 3 DIVISORIAS",
    "MACARRÃO",
    "MONO ARROZ",
    "MONO FEIJÃO",
    "MONO GUARNIÇÃO",
    "MONO PROTEINAS",
    "SALADAS COZIDAS"
];

async function findAlmocoCategory() {
    console.log("\n🔍 Buscando categoria 'Almoço'...\n");

    // Buscar categoria Almoço
    const almocoQuery = query(
        collection(db, "CategoryTree"),
        where("name", "==", "Almoço")
    );
    const snapshot = await getDocs(almocoQuery);

    if (snapshot.empty) {
        console.log("⚠️  Categoria 'Almoço' não encontrada. Buscando variações...");

        // Tentar outras variações
        const variations = ["almoco", "ALMOCO", "Almoco"];
        for (const variation of variations) {
            const varQuery = query(
                collection(db, "CategoryTree"),
                where("name", "==", variation)
            );
            const varSnapshot = await getDocs(varQuery);
            if (!varSnapshot.empty) {
                console.log(`   ✅ Encontrado: ${variation}`);
                return varSnapshot.docs[0];
            }
        }

        return null;
    }

    const doc = snapshot.docs[0];
    console.log(`✅ Categoria 'Almoço' encontrada!`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Dados: ${JSON.stringify(doc.data(), null, 2)}`);
    return doc;
}

async function createSubcategory(name, parentId, parentType, order) {
    // Verificar se já existe
    const existingQuery = query(
        collection(db, "CategoryTree"),
        where("name", "==", name),
        where("parent_id", "==", parentId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        console.log(`   ⏭️  Subcategoria '${name}' já existe, pulando...`);
        return existingSnapshot.docs[0].id;
    }

    // Criar subcategoria
    const subcategoryData = {
        name: name,
        parent_id: parentId,
        type: parentType,
        level: 1, // Subcategoria de nível 1
        order: order,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, "CategoryTree"), subcategoryData);
    console.log(`   ✅ Subcategoria '${name}' criada com ID: ${docRef.id}`);
    return docRef.id;
}

async function createAlmocoSubcategories() {
    console.log("\n🍽️ === CRIANDO SUBCATEGORIAS PARA 'ALMOÇO' ===\n");

    // 1. Encontrar categoria Almoço
    const almocoDoc = await findAlmocoCategory();

    if (!almocoDoc) {
        console.log("\n❌ Categoria 'Almoço' não encontrada no sistema.");
        console.log("   Você precisa criar a categoria 'Almoço' primeiro.");
        return;
    }

    const almocoId = almocoDoc.id;
    const almocoData = almocoDoc.data();
    const almocoType = almocoData.type || "cardapio"; // Usar o tipo da categoria pai

    console.log(`\n📁 Criando subcategorias em 'Almoço' (type: ${almocoType})...\n`);

    // 2. Criar cada subcategoria
    for (let i = 0; i < ALMOCO_SUBCATEGORIES.length; i++) {
        const subcatName = ALMOCO_SUBCATEGORIES[i];
        await createSubcategory(subcatName, almocoId, almocoType, i + 1);
    }

    console.log("\n🎉 Subcategorias criadas com sucesso!");
    console.log(`   Total: ${ALMOCO_SUBCATEGORIES.length} subcategorias`);
}

async function main() {
    try {
        await createAlmocoSubcategories();
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro:", err);
        process.exit(1);
    }
}

main();
