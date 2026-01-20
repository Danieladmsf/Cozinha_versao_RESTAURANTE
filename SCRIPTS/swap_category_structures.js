import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

/**
 * Este script irá INVERTER as estruturas entre:
 * - "Receitas - Setor" (value: receitas)
 * - "Receitas - Base" (value: receitas_-_base)
 * 
 * ANTES:
 *   receitas: Padaria, Rotisseria, Legumes Processados
 *   receitas_-_base: Refogados, Carnes, Guarnição, Massas, Saladas
 * 
 * DEPOIS:
 *   receitas: Refogados, Carnes, Guarnição, Massas, Saladas
 *   receitas_-_base: Padaria, Rotisseria, Legumes Processados
 */

async function swapCategoryStructures() {
    console.log("\n🔄 === INVERTENDO ESTRUTURAS DE CATEGORIAS ===\n");

    // Listar todas as categorias do CategoryTree
    const snapshot = await getDocs(collection(db, "CategoryTree"));

    const categoriesToSwap = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const type = data.type;

        // Somente categorias dos tipos que queremos inverter
        if (type === "receitas" || type === "receitas_-_base") {
            categoriesToSwap.push({
                id: docSnap.id,
                name: data.name,
                currentType: type,
                newType: type === "receitas" ? "receitas_-_base" : "receitas"
            });
        }
    });

    console.log(`📊 Encontradas ${categoriesToSwap.length} categorias para inverter:\n`);

    // Mostrar o que vai mudar
    console.log("🔀 Mudanças que serão feitas:\n");

    const fromReceitas = categoriesToSwap.filter(c => c.currentType === "receitas");
    const fromBase = categoriesToSwap.filter(c => c.currentType === "receitas_-_base");

    console.log("   De 'receitas' → 'receitas_-_base':");
    fromReceitas.forEach(c => console.log(`      - ${c.name}`));

    console.log("\n   De 'receitas_-_base' → 'receitas':");
    fromBase.forEach(c => console.log(`      - ${c.name}`));

    // Executar as atualizações
    console.log("\n⏳ Executando atualizações...\n");

    for (const cat of categoriesToSwap) {
        const docRef = doc(db, "CategoryTree", cat.id);
        await updateDoc(docRef, {
            type: cat.newType,
            updatedAt: new Date()
        });
        console.log(`   ✅ ${cat.name}: ${cat.currentType} → ${cat.newType}`);
    }

    console.log("\n🎉 Inversão concluída com sucesso!");
    console.log("   As categorias foram trocadas entre 'Receitas - Setor' e 'Receitas - Base'.\n");

    process.exit(0);
}

swapCategoryStructures().catch(err => {
    console.error("❌ Erro:", err);
    process.exit(1);
});
