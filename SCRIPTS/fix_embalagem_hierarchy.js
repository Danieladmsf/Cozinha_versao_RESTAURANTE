import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";

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

async function fixEmbalagemHierarchy() {
    console.log("\n🔧 === CORRIGINDO HIERARQUIA DAS CATEGORIAS DE EMBALAGEM ===\n");

    // 1. Verificar se existe categoria Embalagem (raiz)
    const allCats = await getDocs(collection(db, "CategoryTree"));
    let embalagemParent = null;

    allCats.forEach(doc => {
        const data = doc.data();
        if (data.name === "Embalagem" && data.type === "embalagens") {
            embalagemParent = { id: doc.id, ...data };
        }
    });

    // 2. Se não existir Embalagem raiz, criar
    if (!embalagemParent) {
        console.log("⚠️ Categoria 'Embalagem' (raiz) não encontrada com tipo 'embalagens'. Criando...");

        const embDoc = await addDoc(collection(db, "CategoryTree"), {
            name: "Embalagem",
            type: "embalagens",
            level: 1,
            parent_id: null,
            active: true,
            order: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        embalagemParent = { id: embDoc.id, name: "Embalagem" };
        console.log(`✅ Categoria 'Embalagem' criada com ID: ${embDoc.id}`);
    } else {
        console.log(`✅ Categoria 'Embalagem' já existe com ID: ${embalagemParent.id}`);
    }

    // 3. Atualizar Isopor e Plástico para serem filhos de Embalagem
    const q = query(collection(db, "CategoryTree"), where("type", "==", "embalagens"));
    const snapshot = await getDocs(q);

    for (const catDoc of snapshot.docs) {
        const data = catDoc.data();

        if (data.name === "Isopor" || data.name === "Plástico") {
            console.log(`\n📝 Atualizando '${data.name}'...`);
            console.log(`   parent_id: ${data.parent_id || 'NULL'} → ${embalagemParent.id}`);
            console.log(`   level: ${data.level} → 2`);

            await updateDoc(doc(db, "CategoryTree", catDoc.id), {
                parent_id: embalagemParent.id,
                level: 2,
                updatedAt: new Date()
            });

            console.log(`   ✅ Atualizado!`);
        }
    }

    console.log("\n🎉 Hierarquia corrigida!");
    console.log("\nEstrutura final:");
    console.log("📁 Embalagem (raiz, level 1)");
    console.log("   📁 Isopor (subcategoria, level 2)");
    console.log("   📁 Plástico (subcategoria, level 2)");
}

fixEmbalagemHierarchy().then(() => process.exit(0));
