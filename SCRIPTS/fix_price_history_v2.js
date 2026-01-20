import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, writeBatch } from "firebase/firestore";

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

// Fornecedores por categoria de ingrediente
const SUPPLIERS_BY_CATEGORY = {
    // Vegetais, Frutas, Temperos frescos
    "Vegetais": [
        { name: "Hortifruti Fresco", id: "sup_001" },
        { name: "CEASA Central", id: "sup_006" },
        { name: "Feira do Produtor", id: "sup_007" }
    ],
    "Frutas": [
        { name: "Hortifruti Fresco", id: "sup_001" },
        { name: "CEASA Central", id: "sup_006" },
        { name: "Feira do Produtor", id: "sup_007" }
    ],
    // Carnes
    "Carnes": [
        { name: "Frigorífico Central", id: "sup_003" },
        { name: "Açougue Premium", id: "sup_008" },
        { name: "JBS Distribuidora", id: "sup_009" }
    ],
    // Laticínios
    "Laticínios": [
        { name: "Laticínios Santa Clara", id: "sup_010" },
        { name: "Distribuidora Láctea", id: "sup_011" },
        { name: "Frigorífico Central", id: "sup_003" }
    ],
    // Grãos, Farináceos, secos
    "Grãos": [
        { name: "Atacadão Distribuidor", id: "sup_002" },
        { name: "Assaí Atacadista", id: "sup_012" },
        { name: "Makro", id: "sup_013" }
    ],
    "Farináceos": [
        { name: "Atacadão Distribuidor", id: "sup_002" },
        { name: "Assaí Atacadista", id: "sup_012" },
        { name: "Makro", id: "sup_013" }
    ],
    // Temperos secos
    "Temperos": [
        { name: "Atacadão Distribuidor", id: "sup_002" },
        { name: "Distribuidora São José", id: "sup_005" },
        { name: "Hortifruti Fresco", id: "sup_001" }
    ],
    // Óleos
    "Óleos": [
        { name: "Atacadão Distribuidor", id: "sup_002" },
        { name: "Assaí Atacadista", id: "sup_012" },
        { name: "Makro", id: "sup_013" }
    ],
    // Default
    "default": [
        { name: "Atacadão Distribuidor", id: "sup_002" },
        { name: "Mercado Central", id: "sup_004" }
    ]
};

// Marcas por categoria
const BRANDS_BY_CATEGORY = {
    "Carnes": [
        { name: "Sadia", id: "brand_001" },
        { name: "Perdigão", id: "brand_002" },
        { name: "Seara", id: "brand_009" },
        { name: "Friboi", id: "brand_010" }
    ],
    "Laticínios": [
        { name: "Itambé", id: "brand_011" },
        { name: "Parmalat", id: "brand_012" },
        { name: "Piracanjuba", id: "brand_013" }
    ],
    "Grãos": [
        { name: "Camil", id: "brand_004" },
        { name: "Tio João", id: "brand_005" },
        { name: "Kicaldo", id: "brand_014" }
    ],
    "Farináceos": [
        { name: "Yoki", id: "brand_015" },
        { name: "Amafil", id: "brand_016" },
        { name: "Pinduca", id: "brand_017" }
    ],
    "Óleos": [
        { name: "Liza", id: "brand_006" },
        { name: "Soya", id: "brand_007" },
        { name: "Sadia", id: "brand_001" }
    ],
    "Temperos": [
        { name: "Kitano", id: "brand_018" },
        { name: "Knorr", id: "brand_019" },
        { name: "A granel", id: "brand_020" }
    ],
    "Vegetais": [
        { name: "A granel", id: "brand_020" },
        { name: "Orgânicos do Vale", id: "brand_021" }
    ],
    "Frutas": [
        { name: "A granel", id: "brand_020" },
        { name: "Orgânicos do Vale", id: "brand_021" }
    ],
    "default": [
        { name: "Genérico", id: "brand_000" }
    ]
};

function randomDate(monthsBack = 6) {
    const now = new Date();
    const daysBack = Math.floor(Math.random() * (monthsBack * 30));
    const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
}

function varyPrice(basePrice, variationPercent = 0.15) {
    const variation = 1 + (Math.random() * variationPercent * 2 - variationPercent);
    return Math.round(basePrice * variation * 100) / 100;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getSuppliersForCategory(category) {
    return SUPPLIERS_BY_CATEGORY[category] || SUPPLIERS_BY_CATEGORY["default"];
}

function getBrandsForCategory(category) {
    return BRANDS_BY_CATEGORY[category] || BRANDS_BY_CATEGORY["default"];
}

async function fixPriceHistory() {
    console.log("\n🔧 === CORRIGINDO HISTÓRICO COM FORNECEDORES APROPRIADOS ===\n");

    // 1. Deletar todo o histórico atual (exceto embalagens)
    const historySnapshot = await getDocs(collection(db, "PriceHistory"));
    let deletedCount = 0;

    const ingredientsInfo = new Map();

    for (const docSnap of historySnapshot.docs) {
        const data = docSnap.data();

        // Guardar info do ingrediente antes de deletar
        if (!ingredientsInfo.has(data.ingredient_id) && !data.ingredient_name?.toLowerCase().includes('marmita')) {
            ingredientsInfo.set(data.ingredient_id, {
                id: data.ingredient_id,
                name: data.ingredient_name,
                category: data.category,
                unit: data.unit,
                currentPrice: data.new_price
            });
        }

        // Deletar todos os registros que não são de embalagem
        if (!data.ingredient_name?.toLowerCase().includes('marmita')) {
            await deleteDoc(doc(db, "PriceHistory", docSnap.id));
            deletedCount++;
        }
    }

    console.log(`🗑️  ${deletedCount} registros antigos removidos`);
    console.log(`\n📈 Recriando histórico realista para ${ingredientsInfo.size} ingredientes...\n`);

    let createdCount = 0;

    for (const [ingId, ing] of ingredientsInfo) {
        const category = ing.category || "default";
        const suppliers = getSuppliersForCategory(category);
        const brands = getBrandsForCategory(category);

        // Gerar 6-12 registros históricos
        const numRecords = 6 + Math.floor(Math.random() * 7);
        const basePrice = ing.currentPrice;

        // Gerar datas ordenadas (mais antigas primeiro)
        const dates = [];
        for (let i = 0; i < numRecords; i++) {
            dates.push(randomDate(6));
        }
        dates.sort(); // Ordenar cronologicamente

        let previousPrice = varyPrice(basePrice, 0.25);

        for (let i = 0; i < numRecords; i++) {
            const date = dates[i];
            const isLast = i === numRecords - 1;
            // O último registro deve ter o preço atual
            const price = isLast ? basePrice : varyPrice(basePrice, 0.20);
            const supplier = randomChoice(suppliers);
            const brand = randomChoice(brands);

            const changeTypes = ['price_update', 'supplier_change', 'market_adjustment'];
            const changeType = i === 0 ? 'initial_creation' : randomChoice(changeTypes);

            const historyRecord = {
                ingredient_id: ingId,
                ingredient_name: ing.name,
                category: category,
                unit: ing.unit || 'kg',
                old_price: previousPrice,
                new_price: price,
                date: date,
                supplier: supplier.name,
                supplier_id: supplier.id,
                brand: brand.name,
                brand_id: brand.id,
                change_type: changeType,
                change_source: 'enrichment_v2',
                user_id: 'system',
                notes: `Cotação de ${supplier.name}`,
                timestamp: new Date(date).toISOString()
            };

            await addDoc(collection(db, "PriceHistory"), historyRecord);
            createdCount++;
            previousPrice = price;
        }

        console.log(`   ✅ ${ing.name} (${category}): ${numRecords} registros - Fornecedores: ${suppliers.map(s => s.name).join(', ')}`);
    }

    console.log(`\n🎉 Concluído!`);
    console.log(`   - Registros removidos: ${deletedCount}`);
    console.log(`   - Novos registros criados: ${createdCount}`);

    const finalSnapshot = await getDocs(collection(db, "PriceHistory"));
    console.log(`   - Total de registros agora: ${finalSnapshot.size}`);
}

fixPriceHistory().then(() => process.exit(0)).catch(err => {
    console.error("Erro:", err);
    process.exit(1);
});
