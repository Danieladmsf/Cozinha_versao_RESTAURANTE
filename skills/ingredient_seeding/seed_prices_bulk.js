
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
// BULK PRICE UPDATE - Ingredientes sem preço
// Exclui: EMBALAGENS
// =============================================

// Tabela de preços de referência para Food Service (preço/kg ou /L ou /un)
// Baseado em preços de atacado São Paulo Feb/2026
const PRICE_TABLE = {
    // === CARNES BOVINAS ===
    "Patinho": 34.90,
    "Lagarto": 36.90,
    "Acém": 29.90,
    "Maminha": 49.90,
    "Costelinha Desossada": 32.90,
    "Carne Seca": 54.90,
    "Hambúrguer Pronto": 28.90,

    // === AVES ===
    "Peito de Peru": 42.90,

    // === SUÍNOS ===
    "Salsicha": 16.90,
    "Peperoni": 58.90,

    // === PESCADOS ===
    "Camarão": 69.90,
    "Tilápia Fresca": 34.90,
    "Filé de Peixe": 39.90,
    "Filé de Saint Peter": 59.90,
    "Filé de Salmão": 79.90,

    // === LATICÍNIOS / QUEIJOS ===
    "Mussarela Vegana": 65.90,
    "Requeijão Cremoso": 22.90,
    "Requeijão Vegano": 48.90,
    "Provolone": 54.90,
    "Gorgonzola": 72.90,
    "Queijo Coalho": 42.90,
    "Queijo Gouda": 68.90,
    "Leite Semi Desnatado": 5.49,

    // === HORTIFRUTI ===
    "Chuchu": 4.90,
    "Vagem": 12.90,
    "Espinafre": 14.90,
    "Escarola": 8.90,
    "Berinjela": 7.90,
    "Abobrinha": 7.90,
    "Mandioca": 6.90,
    "Mandioquinha": 14.90,
    "Abóbora Cabotiá": 5.90,
    "Pimenta Dedo de Moça": 18.90,
    "Hortelã": 28.90,
    "Tomate Seco": 89.90,
    "Damasco": 79.90,
    "Cogumelo Paris": 42.90,
    "Cogumelo Porcini": 189.90,

    // === MERCEARIA / TEMPEROS ===
    "Feijão Vermelho": 10.90,
    "Feijão Preto": 8.90,
    "Feijão Bolinha": 14.90,
    "Leite de Coco": 12.90,
    "Aceto Balsâmico": 32.90,
    "Alcaparras": 89.90,
    "Suco de Laranja": 8.90,
    "Suco de Limão": 14.90,
    "Farinha de Arroz": 8.90,
    "Gordura Vegetal": 14.90,
    "Melado": 18.90,
    "Mel": 39.90,
    "Molho Inglês": 18.90,
    "Caldo de Carne": 28.90,
    "Caldo de Legumes": 28.90,
    "Caldo de Peixe": 32.90,
    "Batata Palha": 32.90,
    "Vinagre": 6.90,
    "Molho Vermelho": 12.90,
    "Molho Branco": 14.90,
    "Macarrão": 9.90,
    "Massa Pronta": 16.90,
    "Massa Recheada": 28.90,
    "Massa Verde Pronta": 22.90,
    "Tempero Pronto": 18.90,
    "Amaciante de Carnes": 24.90,
    "Pesto de Manjericão": 58.90,
    "Mostarda Dijon": 38.90,
    "Páprica Picante": 48.90,
    "Azeitona Preta": 28.90,
    "Azeitona Verde": 24.90,
    "Azeite de Dendê": 22.90,
    "Fermento Químico": 18.90,
    "Pão": 1.20,
    "Água": 1.50,
};

async function bulkUpdatePrices() {
    console.log("💰 BULK PRICE UPDATE - Ingredientes sem preço (exceto embalagens)\n");

    try {
        const allIngredients = await getDocs(collection(db, "Ingredient"));

        let updated = 0;
        let skipped = 0;
        let notFound = 0;
        const notFoundList = [];

        for (const docSnap of allIngredients.docs) {
            const data = docSnap.data();
            const price = data.current_price;
            const name = data.name || '';
            const category = data.category || '';

            // Pular se já tem preço
            if (price !== undefined && price !== null && price !== 0 && price !== '' && price !== '0') {
                continue;
            }

            // Pular EMBALAGENS
            if (category.toUpperCase() === 'EMBALAGENS' || category.toUpperCase() === 'EMBALAGEM') {
                skipped++;
                continue;
            }

            // Buscar preço na tabela
            const matchedPrice = PRICE_TABLE[name];

            if (matchedPrice) {
                await updateDoc(doc(db, "Ingredient", docSnap.id), {
                    current_price: matchedPrice,
                    last_update: new Date().toISOString().split('T')[0],
                    updatedAt: Timestamp.now()
                });

                // Registrar no histórico de preços
                await addDoc(collection(db, "PriceHistory"), {
                    ingredient_id: docSnap.id,
                    price: matchedPrice,
                    supplier_id: data.supplier_id || null,
                    supplier: data.main_supplier || 'N/A',
                    date: Timestamp.now(),
                    createdAt: Timestamp.now(),
                    notes: 'Preço de referência atacado - Seed Automático Feb/2026'
                });

                console.log(`  ✅ ${name.padEnd(35)} R$ ${matchedPrice.toFixed(2).padStart(7)}/${data.unit || 'kg'}`);
                updated++;
            } else {
                notFound++;
                notFoundList.push({ name, unit: data.unit || '?', category });
            }
        }

        console.log(`\n========================================`);
        console.log(`📊 RESUMO:`);
        console.log(`  ✅ Atualizados:         ${updated}`);
        console.log(`  ⏩ Embalagens (ignorados): ${skipped}`);
        console.log(`  ❓ Sem preço na tabela:  ${notFound}`);
        console.log(`========================================`);

        if (notFoundList.length > 0) {
            console.log(`\n⚠️ Ingredientes que AINDA ficaram sem preço (não encontrados na tabela):\n`);
            notFoundList.forEach((ing, idx) => {
                console.log(`  ${String(idx + 1).padStart(3)}. ${ing.name} (${ing.unit}) [${ing.category}]`);
            });
        }

        console.log("\n✅ Bulk Price Update Completed!");
        setTimeout(() => process.exit(0), 1500);

    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

bulkUpdatePrices();
