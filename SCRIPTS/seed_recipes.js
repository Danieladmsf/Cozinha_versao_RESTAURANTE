
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, addDoc, doc, setDoc } from "firebase/firestore";

// Configuração do Firebase (copiada de lib/firebase.js para ser standalone)
const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🌱 Iniciando script de plantio de dados (Seeding)...");

// --- DADOS PARA CADASTRO ---

const suppliersData = [
    { name: "Atacadão Distribuidor", email: "pedidos@atacadao.com.br", phone: "11999990001", active: true },
    { name: "Hortifruti Fresco", email: "contato@hortifresco.com.br", phone: "11999990002", active: true },
    { name: "Frigorífico Central", email: "vendas@frigocentral.com.br", phone: "11999990003", active: true }
];

const brandsData = [
    { name: "Camil", active: true },
    { name: "Yoki", active: true },
    { name: "Sadia", active: true },
    { name: "Liza", active: true },
    { name: "Cisne", active: true },
    { name: "Qualy", active: true },
    { name: "Horti-Geral", active: true },
    { name: "Kitano", active: true }
];

const ingredientsData = [
    { name: "Arroz Tipo 1", unit: "kg", category: "Grãos", brand: "Camil", supplier: "Atacadão Distribuidor", price: 5.50 },
    { name: "Feijão Carioca", unit: "kg", category: "Grãos", brand: "Camil", supplier: "Atacadão Distribuidor", price: 8.90 },
    { name: "Farinha de Mandioca", unit: "kg", category: "Farináceos", brand: "Yoki", supplier: "Atacadão Distribuidor", price: 6.20 },
    { name: "Peito de Frango s/ Osso", unit: "kg", category: "Carnes", brand: "Sadia", supplier: "Frigorífico Central", price: 22.90 },
    { name: "Bacon", unit: "kg", category: "Carnes", brand: "Sadia", supplier: "Frigorífico Central", price: 35.00 },
    { name: "Abobrinha Italiana", unit: "kg", category: "Vegetais", brand: "Horti-Geral", supplier: "Hortifruti Fresco", price: 4.50 },
    { name: "Cebola", unit: "kg", category: "Vegetais", brand: "Horti-Geral", supplier: "Hortifruti Fresco", price: 3.90 },
    { name: "Alho", unit: "kg", category: "Vegetais", brand: "Horti-Geral", supplier: "Hortifruti Fresco", price: 25.00 },
    { name: "Limão Taiti", unit: "kg", category: "Frutas", brand: "Horti-Geral", supplier: "Hortifruti Fresco", price: 5.00 },
    { name: "Óleo de Soja", unit: "L", category: "Óleos", brand: "Liza", supplier: "Atacadão Distribuidor", price: 7.50 },
    { name: "Manteiga", unit: "kg", category: "Laticínios", brand: "Qualy", supplier: "Frigorífico Central", price: 45.00 },
    { name: "Sal Refinado", unit: "kg", category: "Temperos", brand: "Cisne", supplier: "Atacadão Distribuidor", price: 2.50 },
    { name: "Pimenta do Reino", unit: "kg", category: "Temperos", brand: "Kitano", supplier: "Atacadão Distribuidor", price: 89.00 },
    { name: "Louro (Folhas)", unit: "g", category: "Temperos", brand: "Kitano", supplier: "Hortifruti Fresco", price: 0.15 } // Preço por grama alta, ou pct
];


// Helpers
async function getEntityIdByName(collectionName, name) {
    const q = query(collection(db, collectionName), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id; // Retorna o ID do primeiro que achar
    }
    return null;
}

// Função auxiliar para criar histórico de preço
async function createPriceHistory(ingredientId, item, supplierName) {
    try {
        await addDoc(collection(db, "PriceHistory"), {
            ingredient_id: ingredientId,
            old_price: 0,
            new_price: item.price,
            date: new Date().toISOString().split('T')[0],
            supplier: supplierName,
            supplier_id: null, // Simplificado
            brand: item.brand,
            brand_id: null, // Simplificado
            category: item.category,
            unit: item.unit,
            ingredient_name: item.name,
            change_type: 'initial_creation',
            change_source: 'seed_script',
            user_id: 'system_seed',
            notes: 'Preço inicial (Seed)',
            timestamp: new Date().toISOString()
        });
        console.log(`   ↳ 📈 Histórico de preço criado para ${item.name}`);
    } catch (e) {
        console.error(`   ↳ ❌ Falha ao criar histórico: ${e.message}`);
    }
}

async function seed() {
    // 1. Fornecedores
    console.log("\n--- Processando Fornecedores ---");
    for (const sup of suppliersData) {
        const existingId = await getEntityIdByName("Supplier", sup.name);
        if (!existingId) {
            await addDoc(collection(db, "Supplier"), {
                ...sup,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Fornecedor criado: ${sup.name}`);
        } else {
            console.log(`ℹ️ Fornecedor já existe: ${sup.name}`);
        }
    }

    // 2. Marcas
    console.log("\n--- Processando Marcas ---");
    for (const brand of brandsData) {
        const existingId = await getEntityIdByName("Brand", brand.name);
        if (!existingId) {
            await addDoc(collection(db, "Brand"), {
                ...brand,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Marca criada: ${brand.name}`);
        } else {
            console.log(`ℹ️ Marca já existe: ${brand.name}`);
        }
    }

    // 3. Categorias (Garantir que existem em AMBAS as collections)
    console.log("\n--- Processando Categorias (Category e CategoryTree) ---");
    const categories = [...new Set(ingredientsData.map(i => i.category))];

    for (const catName of categories) {
        // 3.1 Collection 'Category' (Legado/Simples)
        const existingId = await getEntityIdByName("Category", catName);
        if (!existingId) {
            await addDoc(collection(db, "Category"), {
                name: catName,
                type: 'ingredient',
                active: true,
                level: 1,
                parent_id: null,
                description: "Categoria criada via seed",
                createdAt: new Date()
            });
            console.log(`✅ Categoria criada em 'Category': ${catName}`);
        }

        // 3.2 Collection 'CategoryTree' (Usada na UI de Arvore)
        const existingTreeId = await getEntityIdByName("CategoryTree", catName);

        // Sempre tentar atualizar ou criar
        const treePayload = {
            name: catName,
            type: 'ingredientes', // Plural conforme Categories.jsx
            active: true,
            level: 1, // ✅ CORREÇÃO: Raiz é nível 1
            parent_id: null,
            index: 0,
            updatedAt: new Date()
        };

        if (!existingTreeId) {
            await addDoc(collection(db, "CategoryTree"), {
                ...treePayload,
                createdAt: new Date()
            });
            console.log(`✅ Categoria criada em 'CategoryTree': ${catName}`);
        } else {
            // Update para garantir nível correto
            const treeRef = doc(db, "CategoryTree", existingTreeId);
            await setDoc(treeRef, treePayload, { merge: true });
            console.log(`🔄 Categoria atualizada em 'CategoryTree' (Nível corrigido): ${catName}`);
        }
    }

    // 4. Ingredientes (CREATE OR UPDATE)
    console.log("\n--- Processando Ingredientes (Mode: Upsert) ---");
    for (const item of ingredientsData) {
        const supplierId = await getEntityIdByName("Supplier", item.supplier);
        const brandId = await getEntityIdByName("Brand", item.brand);

        // Objeto correto com current_price
        const ingredientPayload = {
            name: item.name,
            commercial_name: item.name, // Nome comercial igual
            category: item.category,
            unit: item.unit,
            current_price: item.price, // ✅ CORREÇÃO: current_price
            current_stock: 0,
            min_stock: 5, // ✅ Valor default sensato
            active: true,

            // Relacionamentos
            supplierId: supplierId || "",
            main_supplier: item.supplier,
            supplier_code: "", // Vazio por padrão

            brandId: brandId || "",
            brand: item.brand,

            last_update: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            updatedAt: new Date(),
            ingredient_type: "both",
            notes: "Cadastrado via Seed Automático"
        };

        const existingId = await getEntityIdByName("Ingredient", item.name);

        if (!existingId) {
            // CREATE
            if (supplierId && brandId) {
                const docRef = await addDoc(collection(db, "Ingredient"), {
                    ...ingredientPayload,
                    createdAt: new Date()
                });
                console.log(`✅ Ingrediente criado: ${item.name}`);
                // Criar histórico
                await createPriceHistory(docRef.id, item, item.supplier);
            } else {
                console.error(`❌ Falha ao criar ${item.name}: Deps missing.`);
            }
        } else {
            // UPDATE (Fix missing fields)
            console.log(`🔄 Atualizando dados de: ${item.name}`);
            const docRef = doc(db, "Ingredient", existingId);
            await setDoc(docRef, ingredientPayload, { merge: true });

            // Criar hitórico se não existir (opcional, vou forçar 1 registro inicial se quiser garantir gráfico)
            // Mas para não duplicar muito, deixo quieto ou crio? Vou criar.
            await createPriceHistory(existingId, item, item.supplier);
        }
    }

    console.log("\n🎉 Seeding (v2) concluído com sucesso!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Erro fatal no seed:", err);
    process.exit(1);
});
