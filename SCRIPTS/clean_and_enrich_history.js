import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";

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

// Fornecedores disponíveis
const SUPPLIERS = [
    { name: "Hortifruti Fresco", id: "sup_001" },
    { name: "Atacadão Distribuidor", id: "sup_002" },
    { name: "Frigorífico Central", id: "sup_003" },
    { name: "Mercado Central", id: "sup_004" },
    { name: "Distribuidora São José", id: "sup_005" }
];

// Marcas disponíveis
const BRANDS = [
    { name: "Sadia", id: "brand_001" },
    { name: "Perdigão", id: "brand_002" },
    { name: "Nestlé", id: "brand_003" },
    { name: "Camil", id: "brand_004" },
    { name: "Tio João", id: "brand_005" },
    { name: "Liza", id: "brand_006" },
    { name: "Soya", id: "brand_007" },
    { name: "Gran Reserva", id: "brand_008" }
];

// Função para gerar data aleatória nos últimos 6 meses
function randomDate(monthsBack = 6) {
    const now = new Date();
    const daysBack = Math.floor(Math.random() * (monthsBack * 30));
    const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
}

// Função para variar preço (± até 15%)
function varyPrice(basePrice, variationPercent = 0.15) {
    const variation = 1 + (Math.random() * variationPercent * 2 - variationPercent);
    return Math.round(basePrice * variation * 100) / 100;
}

// Função para escolher item aleatório
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function cleanAndEnrichPriceHistory() {
    console.log("\n🧹 === LIMPANDO DUPLICADOS E ENRIQUECENDO HISTÓRICO ===\n");

    // 1. Carregar todos os registros de histórico
    const historySnapshot = await getDocs(collection(db, "PriceHistory"));
    console.log(`Total de registros antes: ${historySnapshot.size}`);

    // 2. Agrupar por ingredient_id e identificar duplicados
    const byIngredient = {};

    historySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const ingId = data.ingredient_id;

        if (!byIngredient[ingId]) {
            byIngredient[ingId] = [];
        }
        byIngredient[ingId].push({
            id: docSnap.id,
            ...data
        });
    });

    // 3. Deletar duplicados (manter apenas o primeiro de cada grupo com mesma data/preço)
    let deletedCount = 0;
    const ingredientsToEnrich = [];

    for (const [ingId, records] of Object.entries(byIngredient)) {
        const seen = new Set();

        for (const record of records) {
            const key = `${record.date}_${record.new_price}`;

            if (seen.has(key)) {
                // É duplicado, deletar
                await deleteDoc(doc(db, "PriceHistory", record.id));
                deletedCount++;
            } else {
                seen.add(key);
                // Guardar info do ingrediente para enriquecer
                if (!ingredientsToEnrich.find(i => i.id === ingId)) {
                    ingredientsToEnrich.push({
                        id: ingId,
                        name: record.ingredient_name,
                        category: record.category,
                        unit: record.unit,
                        currentPrice: record.new_price
                    });
                }
            }
        }
    }

    console.log(`✅ ${deletedCount} registros duplicados removidos`);

    // 4. Criar histórico enriquecido para cada ingrediente
    console.log(`\n📈 Criando histórico realista para ${ingredientsToEnrich.length} ingredientes...\n`);

    let createdCount = 0;

    for (const ing of ingredientsToEnrich) {
        // Ignorar embalagens
        if (ing.name?.toLowerCase().includes('marmita')) continue;

        // Gerar 5-10 registros históricos
        const numRecords = 5 + Math.floor(Math.random() * 6);
        const basePrice = ing.currentPrice;

        for (let i = 0; i < numRecords; i++) {
            const date = randomDate(6);
            const price = varyPrice(basePrice, 0.20); // Variação de até 20%
            const oldPrice = i === 0 ? 0 : varyPrice(basePrice, 0.20);
            const supplier = randomChoice(SUPPLIERS);
            const brand = randomChoice(BRANDS);

            const changeTypes = ['price_update', 'supplier_change', 'market_adjustment', 'promotion'];
            const changeType = i === 0 ? 'initial_creation' : randomChoice(changeTypes);

            const historyRecord = {
                ingredient_id: ing.id,
                ingredient_name: ing.name,
                category: ing.category,
                unit: ing.unit || 'kg',
                old_price: oldPrice,
                new_price: price,
                date: date,
                supplier: supplier.name,
                supplier_id: supplier.id,
                brand: brand.name,
                brand_id: brand.id,
                change_type: changeType,
                change_source: 'enrichment_script',
                user_id: 'system',
                notes: `Atualização de preço - ${changeType}`,
                timestamp: new Date(date).toISOString()
            };

            await addDoc(collection(db, "PriceHistory"), historyRecord);
            createdCount++;
        }

        console.log(`   ✅ ${ing.name}: ${numRecords} registros criados`);
    }

    console.log(`\n🎉 Concluído!`);
    console.log(`   - Duplicados removidos: ${deletedCount}`);
    console.log(`   - Novos registros criados: ${createdCount}`);

    // Verificar total final
    const finalSnapshot = await getDocs(collection(db, "PriceHistory"));
    console.log(`   - Total de registros agora: ${finalSnapshot.size}`);
}

cleanAndEnrichPriceHistory().then(() => process.exit(0)).catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
