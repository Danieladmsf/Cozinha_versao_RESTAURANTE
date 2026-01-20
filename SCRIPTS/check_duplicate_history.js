import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

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

async function checkDuplicatePriceHistory() {
    console.log("\n📊 === VERIFICANDO HISTÓRICO DE PREÇOS DUPLICADOS ===\n");

    const snapshot = await getDocs(collection(db, "PriceHistory"));
    console.log(`Total de registros no PriceHistory: ${snapshot.size}\n`);

    // Agrupar por ingredient_id
    const byIngredient = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const ingId = data.ingredient_id;

        if (!byIngredient[ingId]) {
            byIngredient[ingId] = [];
        }
        byIngredient[ingId].push({
            id: doc.id,
            ingredient_name: data.ingredient_name,
            date: data.date,
            new_price: data.new_price,
            change_type: data.change_type,
            timestamp: data.timestamp
        });
    });

    // Mostrar resumo
    console.log("📋 Resumo por ingrediente:\n");

    for (const [ingId, records] of Object.entries(byIngredient)) {
        const name = records[0]?.ingredient_name || 'Desconhecido';
        console.log(`📦 ${name} (${ingId})`);
        console.log(`   Total registros: ${records.length}`);

        // Verificar duplicados (mesmo preço e mesma data)
        const uniqueKey = new Set();
        const duplicates = [];

        records.forEach(r => {
            const key = `${r.date}_${r.new_price}`;
            if (uniqueKey.has(key)) {
                duplicates.push(r);
            } else {
                uniqueKey.add(key);
            }
        });

        if (duplicates.length > 0) {
            console.log(`   ⚠️  DUPLICADOS: ${duplicates.length} registros duplicados`);
        }

        // Mostrar últimos 5 registros
        console.log(`   Últimos registros:`);
        records.slice(0, 5).forEach(r => {
            console.log(`      - ${r.date} | R$ ${r.new_price} | ${r.change_type}`);
        });

        console.log('');
    }
}

checkDuplicatePriceHistory().then(() => process.exit(0));
