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

// Fornecedores reais com dados completos
const SUPPLIERS_TO_CREATE = [
    {
        name: "Hortifruti Fresco",
        business_name: "Hortifruti Fresco Ltda",
        type: "fornecedor",
        category: "Hortifruti",
        phone: "(11) 99999-1111",
        whatsapp: "(11) 99999-1111",
        email: "contato@hortifrutifresco.com.br",
        address: "Rua das Frutas, 123 - São Paulo/SP",
        cnpj: "12.345.678/0001-01",
        active: true,
        notes: "Entrega diária de hortifruti"
    },
    {
        name: "CEASA Central",
        business_name: "CEASA Central de Abastecimento",
        type: "fornecedor",
        category: "Hortifruti",
        phone: "(11) 99999-2222",
        whatsapp: "(11) 99999-2222",
        email: "vendas@ceasacentral.com.br",
        address: "Av. Central, 456 - São Paulo/SP",
        cnpj: "23.456.789/0001-02",
        active: true,
        notes: "Atacado de frutas e verduras"
    },
    {
        name: "Feira do Produtor",
        business_name: "Cooperativa Feira do Produtor",
        type: "fornecedor",
        category: "Hortifruti",
        phone: "(11) 99999-3333",
        whatsapp: "(11) 99999-3333",
        email: "contato@feiradoprodutor.coop",
        address: "Rua Rural, 789 - São Paulo/SP",
        cnpj: "34.567.890/0001-03",
        active: true,
        notes: "Produtos orgânicos direto do produtor"
    },
    {
        name: "Frigorífico Central",
        business_name: "Frigorífico Central S/A",
        type: "fornecedor",
        category: "Carnes",
        phone: "(11) 99999-4444",
        whatsapp: "(11) 99999-4444",
        email: "vendas@frigorificocentral.com.br",
        address: "Av. das Carnes, 1000 - São Paulo/SP",
        cnpj: "45.678.901/0001-04",
        active: true,
        notes: "Carnes bovinas e suínas"
    },
    {
        name: "Açougue Premium",
        business_name: "Açougue Premium Ltda",
        type: "fornecedor",
        category: "Carnes",
        phone: "(11) 99999-5555",
        whatsapp: "(11) 99999-5555",
        email: "contato@acouguepremium.com.br",
        address: "Rua dos Açougues, 200 - São Paulo/SP",
        cnpj: "56.789.012/0001-05",
        active: true,
        notes: "Cortes especiais"
    },
    {
        name: "JBS Distribuidora",
        business_name: "JBS Alimentos Distribuidora",
        type: "fornecedor",
        category: "Carnes",
        phone: "(11) 99999-6666",
        whatsapp: "(11) 99999-6666",
        email: "vendas@jbsdistribuidora.com.br",
        address: "Av. Industrial, 3000 - São Paulo/SP",
        cnpj: "67.890.123/0001-06",
        active: true,
        notes: "Distribuidora nacional de carnes"
    },
    {
        name: "Atacadão Distribuidor",
        business_name: "Atacadão Distribuidor S/A",
        type: "fornecedor",
        category: "Atacado",
        phone: "(11) 99999-7777",
        whatsapp: "(11) 99999-7777",
        email: "vendas@atacadao.com.br",
        address: "Av. do Atacado, 5000 - São Paulo/SP",
        cnpj: "78.901.234/0001-07",
        active: true,
        notes: "Atacado geral - secos e molhados"
    },
    {
        name: "Assaí Atacadista",
        business_name: "Assaí Atacadista S/A",
        type: "fornecedor",
        category: "Atacado",
        phone: "(11) 99999-8888",
        whatsapp: "(11) 99999-8888",
        email: "vendas@assai.com.br",
        address: "Av. Atacadista, 6000 - São Paulo/SP",
        cnpj: "89.012.345/0001-08",
        active: true,
        notes: "Atacado de alimentos"
    },
    {
        name: "Makro",
        business_name: "Makro Atacadista S/A",
        type: "fornecedor",
        category: "Atacado",
        phone: "(11) 99999-9999",
        whatsapp: "(11) 99999-9999",
        email: "vendas@makro.com.br",
        address: "Av. Comercial, 7000 - São Paulo/SP",
        cnpj: "90.123.456/0001-09",
        active: true,
        notes: "Atacado exclusivo para empresas"
    },
    {
        name: "Laticínios Santa Clara",
        business_name: "Laticínios Santa Clara Ltda",
        type: "fornecedor",
        category: "Laticínios",
        phone: "(11) 99999-0000",
        whatsapp: "(11) 99999-0000",
        email: "vendas@santaclara.com.br",
        address: "Rua dos Laticínios, 100 - São Paulo/SP",
        cnpj: "01.234.567/0001-10",
        active: true,
        notes: "Leite, queijos e derivados"
    },
    {
        name: "Distribuidora Láctea",
        business_name: "Distribuidora Láctea S/A",
        type: "fornecedor",
        category: "Laticínios",
        phone: "(11) 98888-1111",
        whatsapp: "(11) 98888-1111",
        email: "contato@distribuidoralactea.com.br",
        address: "Av. dos Queijos, 200 - São Paulo/SP",
        cnpj: "11.222.333/0001-11",
        active: true,
        notes: "Especializada em laticínios"
    },
    {
        name: "Distribuidora São José",
        business_name: "Distribuidora São José Ltda",
        type: "fornecedor",
        category: "Geral",
        phone: "(11) 98888-2222",
        whatsapp: "(11) 98888-2222",
        email: "vendas@saojose.com.br",
        address: "Rua São José, 300 - São Paulo/SP",
        cnpj: "22.333.444/0001-12",
        active: true,
        notes: "Distribuidor geral de alimentos"
    }
];

async function createSuppliersAndLinkHistory() {
    console.log("\n📦 === CRIANDO FORNECEDORES NA COLEÇÃO OFICIAL ===\n");

    // 1. Verificar fornecedores existentes
    const existingSnapshot = await getDocs(collection(db, "Supplier"));
    const existingNames = new Set();
    existingSnapshot.forEach(doc => {
        existingNames.add(doc.data().name);
    });

    console.log(`Fornecedores já existentes: ${existingNames.size}`);

    // 2. Criar fornecedores que não existem
    const supplierIdMap = new Map(); // name -> id
    let createdCount = 0;

    for (const supplier of SUPPLIERS_TO_CREATE) {
        if (existingNames.has(supplier.name)) {
            console.log(`   ⏭️  ${supplier.name} já existe`);
            // Buscar ID existente
            const q = query(collection(db, "Supplier"), where("name", "==", supplier.name));
            const snap = await getDocs(q);
            if (!snap.empty) {
                supplierIdMap.set(supplier.name, snap.docs[0].id);
            }
        } else {
            const docRef = await addDoc(collection(db, "Supplier"), {
                ...supplier,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            supplierIdMap.set(supplier.name, docRef.id);
            console.log(`   ✅ ${supplier.name} criado (${docRef.id})`);
            createdCount++;
        }
    }

    console.log(`\n✅ ${createdCount} fornecedores criados`);

    // 3. Atualizar histórico de preços com os IDs corretos
    console.log("\n🔄 Atualizando histórico de preços com IDs de fornecedores...\n");

    const historySnapshot = await getDocs(collection(db, "PriceHistory"));
    let updatedCount = 0;

    for (const historyDoc of historySnapshot.docs) {
        const data = historyDoc.data();
        const supplierName = data.supplier;

        if (supplierName && supplierIdMap.has(supplierName)) {
            const supplierId = supplierIdMap.get(supplierName);

            // Atualizar apenas se o supplier_id estiver diferente
            if (data.supplier_id !== supplierId) {
                await updateDoc(doc(db, "PriceHistory", historyDoc.id), {
                    supplier_id: supplierId
                });
                updatedCount++;
            }
        }
    }

    console.log(`✅ ${updatedCount} registros de histórico atualizados com IDs de fornecedores`);

    // 4. Resumo final
    const finalSuppliers = await getDocs(collection(db, "Supplier"));
    console.log(`\n🎉 Concluído!`);
    console.log(`   - Total de fornecedores: ${finalSuppliers.size}`);
    console.log(`   - Históricos atualizados: ${updatedCount}`);
}

createSuppliersAndLinkHistory().then(() => process.exit(0)).catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
