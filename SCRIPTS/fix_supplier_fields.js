import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

async function fixSupplierFields() {
    console.log("\n🔧 === CORRIGINDO CAMPOS DOS FORNECEDORES ===\n");

    const snapshot = await getDocs(collection(db, "Supplier"));
    let updatedCount = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const updates = {};

        // 1. Mapear company_name (Nome da Empresa na tabela)
        // Se não tiver company_name, usa name ou business_name
        if (!data.company_name) {
            updates.company_name = data.name || data.business_name || "Fornecedor Sem Nome";
        }

        // 2. Mapear vendor_name (Nome do Vendedor)
        // Se não tiver, coloca um valor genérico
        if (!data.vendor_name) {
            updates.vendor_name = "Departamento Comercial";
        }

        // 3. Mapear vendor_phone (WhatsApp)
        // Se não tiver vendor_phone, usa phone ou whatsapp
        if (!data.vendor_phone) {
            updates.vendor_phone = data.phone || data.whatsapp || "";
        }

        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "Supplier", docSnap.id), updates);
            console.log(`✅ ${data.name || data.business_name} atualizado`);
            updatedCount++;
        }
    }

    console.log(`\n🎉 Concluído!`);
    console.log(`   - Fornecedores corrigidos: ${updatedCount}`);
}

fixSupplierFields().then(() => process.exit(0)).catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
