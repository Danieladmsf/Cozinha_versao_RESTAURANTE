const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function run() {
    try {
        console.log("Buscando Menus...");
        const ordersRef = db.collection('WeeklyMenu');

        // Categoria 1: Busca cravada pela data
        const snapshot = await ordersRef.where('date', '==', '2026-02-24').get();
        if (snapshot.empty) {
            console.log("Nenhum pedido encontrado cravado em 24/02/2026 usando 'date'");

            // Fallback: varrer os ultimos 20 e olhar as datas
            console.log("\n-> Tentando os 10 últimos pedidos sem filtro para debugar a data:");
            const fall = await ordersRef.limit(10).get();
            fall.forEach(d => console.log(d.id, d.data().date));
            return;
        }

        console.log(`Encontrados ${snapshot.size} pedidos para o dia 24/02/2026`);

        const targetOrders = [];
        snapshot.forEach(doc => {
            targetOrders.push(doc.data());
        });

        const allItems = [];
        for (const order of targetOrders) {
            if (order.items) {
                allItems.push(...order.items);
            }
        }

        console.log(`\n--- Itens Pedidos ---`);
        const itemMap = {};
        for (const item of allItems) {
            const qty = Number(item.quantity) || item.base_quantity || 0;
            if (qty > 0) {
                if (!itemMap[item.recipe_id]) {
                    itemMap[item.recipe_id] = {
                        name: item.recipe_name,
                        qty: 0,
                        unit: item.unit_type
                    };
                }
                itemMap[item.recipe_id].qty += qty;
            }
        }

        const recipeIds = Object.keys(itemMap);
        console.log(`Total de Receitas Únicas Pedidas com Consumo Real: ${recipeIds.length}`);

        let totalArrozCru = 0;

        for (const rId of recipeIds) {
            const rDoc = await db.collection('Recipe').doc(rId).get();
            if (rDoc.exists) {
                const recipe = rDoc.data();
                const orderedQty = itemMap[rId].qty;
                const unit = itemMap[rId].unit || '';

                const hasArroz = (recipe.ingredients || []).some(ing => (ing.name || '').toLowerCase().includes('arroz'));
                if (hasArroz || recipe.name.toLowerCase().includes('arroz')) {
                    console.log(`\n==============================================`);
                    console.log(`[RECEITA]: ${recipe.name}`);
                    console.log(`  ➤ Pedido Total: ${orderedQty} ${unit}`);

                    const cubaWeight = parseFloat(recipe.cuba_weight) || 1;

                    let weightDemanded = orderedQty;
                    if (unit.toLowerCase().includes('unid')) {
                        let units_qty = 1;
                        const prep = (recipe.preparations || []).find(p => p.assembly_config?.units_quantity);
                        if (prep && prep.assembly_config.units_quantity) {
                            units_qty = parseFloat(prep.assembly_config.units_quantity);
                        } else if (recipe.assemblies && recipe.assemblies.length > 0) {
                            const asm = recipe.assemblies[0];
                            if (asm.units_quantity) units_qty = parseFloat(asm.units_quantity);
                        }
                        weightDemanded = (cubaWeight / units_qty) * orderedQty;
                    }

                    console.log(`  ➤ Peso Total Demandado da Receita (kg): ${weightDemanded.toFixed(3)}`);

                    const recipeBaseYield = parseFloat(recipe.yield_weight) || 1;
                    const recipeScale = weightDemanded / recipeBaseYield;

                    console.log(`  ➤ Fator de Escala [Demanda / Rendimento Ficha ${recipeBaseYield.toFixed(2)}kg]: ${recipeScale.toFixed(4)}`);

                    let arrozReceita = 0;
                    for (const ing of (recipe.ingredients || [])) {
                        if ((ing.name || '').toLowerCase().includes('arroz')) {
                            const brut = parseFloat(ing.brut_weight) || 0;
                            const calcConsumo = brut * recipeScale;
                            arrozReceita += calcConsumo;
                            console.log(`    - Ingrediente: ${ing.name}`);
                            console.log(`      ↳ Peso Cru / Receita 1x: ${brut.toFixed(3)}kg`);
                            console.log(`      ↳ Consumo (Proporcional à Venda): ${calcConsumo.toFixed(3)}kg`);
                        }
                    }
                    totalArrozCru += arrozReceita;
                }
            }
        }

        console.log(`\n============================`);
        console.log(`TOTAL DE ARROZ CRU CALCULADO GERAL: ${totalArrozCru.toFixed(3)} kg`);

    } catch (e) {
        console.error(e);
    }
}

run();
