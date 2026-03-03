
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    Timestamp
} from 'firebase/firestore';

// =============================================
// SEGUNDA PASSADA - 34 itens restantes
// =============================================

const PRICE_TABLE_2 = {
    "Margarina": 12.90,
    "Açúcar Refinado": 4.90,
    "Brócolis": 12.90,
    "Lombo de Porco": 29.90,
    "Alho Poro": 18.90,
    "Maionese": 14.90,
    "Cebola Roxa": 6.90,
    "Cogumelo Shitake": 68.90,
    "Cominho": 42.90,
    "Queijo Prato": 44.90,
    "Tomilho Fresco": 38.90,
    "Abadejo": 49.90,
    "Óleo de Girassol": 8.90,
    "Couve-Flor": 9.90,
    "Molho de Pimenta": 28.90,
    "Funghi Secchi": 149.90,
    "Bacalhau": 119.90,
    "Goiabada": 18.90,
    "Pernil": 19.90,
    "Creme de Cebola": 12.90,
    "Cajupiry Vegano": 62.90,
    "Leite de Amêndoas": 22.90,
    "Fermento Seco": 48.90,
    "Fermento Fresco": 32.90,
    "Palmito": 42.90,
    "Alface": 6.90,
    "Parmesão": 79.90,
    "Manjericão": 32.90,
    "Iogurte Desnatado": 12.90,
    "Tomate Pelado": 14.90,
    "Queijo Fresco": 34.90,
    "Massa Pronta Rondelli": 24.90,
    "Paio": 48.90,
    "Pão Italiano": 2.50
};

async function fillRemainingPrices() {
    console.log("💰 SEGUNDA PASSADA - 34 ingredientes restantes\n");

    try {
        const allIngredients = await getDocs(collection(db, "Ingredient"));

        let updated = 0;

        for (const docSnap of allIngredients.docs) {
            const data = docSnap.data();
            const price = data.current_price;
            const name = data.name || '';
            const category = data.category || '';

            // Pular se já tem preço
            if (price !== undefined && price !== null && price !== 0 && price !== '' && price !== '0') continue;
            // Pular embalagens
            if (category.toUpperCase().includes('EMBALAGE')) continue;

            const matchedPrice = PRICE_TABLE_2[name];

            if (matchedPrice) {
                await updateDoc(doc(db, "Ingredient", docSnap.id), {
                    current_price: matchedPrice,
                    last_update: new Date().toISOString().split('T')[0],
                    updatedAt: Timestamp.now()
                });

                await addDoc(collection(db, "PriceHistory"), {
                    ingredient_id: docSnap.id,
                    price: matchedPrice,
                    supplier_id: data.supplier_id || null,
                    supplier: data.main_supplier || 'N/A',
                    date: Timestamp.now(),
                    createdAt: Timestamp.now(),
                    notes: 'Preço de referência atacado - Seed Automático Feb/2026 (2ª passada)'
                });

                console.log(`  ✅ ${name.padEnd(35)} R$ ${matchedPrice.toFixed(2).padStart(7)}/${data.unit || 'kg'}`);
                updated++;
            }
        }

        // Verificação final
        let stillMissing = 0;
        const missing = [];
        const allAfter = await getDocs(collection(db, "Ingredient"));
        allAfter.forEach(d => {
            const dd = d.data();
            const p = dd.current_price;
            const cat = dd.category || '';
            if (cat.toUpperCase().includes('EMBALAGE')) return;
            if (p === undefined || p === null || p === 0 || p === '' || p === '0') {
                stillMissing++;
                missing.push(dd.name);
            }
        });

        console.log(`\n📊 RESULTADO: ${updated} atualizados nesta passada.`);
        if (stillMissing > 0) {
            console.log(`⚠️ Ainda restam ${stillMissing} sem preço: ${missing.join(', ')}`);
        } else {
            console.log("🎉 TODOS os ingredientes (exceto embalagens) agora possuem preço!");
        }

        console.log("\n✅ Done!");
        setTimeout(() => process.exit(0), 1500);
    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

fillRemainingPrices();
