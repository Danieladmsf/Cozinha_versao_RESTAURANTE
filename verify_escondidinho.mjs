import { db } from './lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkEscondidinho() {
    console.log("🔍 Verificando 'escondidinho' no banco de dados para 12/03/2026...");

    // 1. Verificar no WeeklyMenu (Semana 11)
    console.log("\n--- WeeklyMenu (2026-W11) ---");
    const weeklySnap = await getDocs(query(collection(db, 'WeeklyMenu'), where('week_key', '==', '2026-W11')));
    
    if (weeklySnap.empty) {
        console.log("❌ Documento 2026-W11 não encontrado no WeeklyMenu.");
    } else {
        weeklySnap.forEach(doc => {
            const data = doc.data();
            console.log(`Doc ID: ${doc.id}`);
            
            // Supondo que os itens estejam em 'days' ou algo similar
            // Vamos procurar em todo o objeto por 'escondidinho'
            const dataStr = JSON.stringify(data).toLowerCase();
            if (dataStr.includes('escondidinho')) {
                console.log("⚠️ ENCONTRADO 'escondidinho' no WeeklyMenu!");
                
                // Tenta localizar onde está
                if (data.days) {
                    Object.entries(data.days).forEach(([day, meals]) => {
                        if (JSON.stringify(meals).toLowerCase().includes('escondidinho')) {
                            console.log(`   - No dia: ${day}`);
                            // Se meals é um array de itens
                            if (Array.isArray(meals)) {
                                meals.forEach(m => {
                                    if (JSON.stringify(m).toLowerCase().includes('escondidinho')) {
                                        console.log(`     - Item: ${m.recipe_name || m.name || JSON.stringify(m)}`);
                                    }
                                });
                            }
                        }
                    });
                }
            } else {
                console.log("✅ 'escondidinho' NÃO encontrado no WeeklyMenu (2026-W11).");
            }
        });
    }

    // 2. Verificar no ProductionOrder
    console.log("\n--- ProductionOrder ---");
    // Procurar por OPs criadas recentemente ou com data de hoje
    const poSnap = await getDocs(collection(db, 'ProductionOrder'));
    let foundInPO = false;
    
    poSnap.forEach(doc => {
        const data = doc.data();
        const dataStr = JSON.stringify(data).toLowerCase();
        
        // Verifica se a data é próxima a 12/03/2026 ou se contém o termo
        if (dataStr.includes('escondidinho')) {
            foundInPO = true;
            console.log(`⚠️ ENCONTRADO 'escondidinho' na OP ID: ${doc.id}`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Items: ${data.items?.length || 0}`);
            
            if (data.items) {
                data.items.forEach(item => {
                    if (JSON.stringify(item).toLowerCase().includes('escondidinho')) {
                        console.log(`     - [${item.category}] ${item.recipe_name || item.name}`);
                    }
                });
            }
        }
    });

    if (!foundInPO) {
        console.log("✅ 'escondidinho' NÃO encontrado em nenhuma ProductionOrder.");
    }

    // 3. Verificar no Orders
    console.log("\n--- Orders ---");
    const ordersSnap = await getDocs(collection(db, 'Orders'));
    let foundInOrders = false;
    
    ordersSnap.forEach(doc => {
        const data = doc.data();
        const dataStr = JSON.stringify(data).toLowerCase();
        
        if (dataStr.includes('escondidinho')) {
            foundInOrders = true;
            console.log(`⚠️ ENCONTRADO 'escondidinho' no Order ID: ${doc.id}`);
            // Check day
            if (data.day_of_week) console.log(`   Dia: ${data.day_of_week}`);
            if (data.items) {
                data.items.forEach(item => {
                    if (JSON.stringify(item).toLowerCase().includes('escondidinho')) {
                        console.log(`     - ${item.recipe_name || item.name}`);
                    }
                });
            }
        }
    });

    if (!foundInOrders) {
        console.log("✅ 'escondidinho' NÃO encontrado na coleção Orders.");
    }

    // 4. Verificar no ProductionOrders (plural)
    console.log("\n--- ProductionOrders (plural) ---");
    const posSnap = await getDocs(collection(db, 'ProductionOrders'));
    let foundInPOs = false;
    
    posSnap.forEach(doc => {
        const data = doc.data();
        const dataStr = JSON.stringify(data).toLowerCase();
        
        if (dataStr.includes('escondidinho')) {
            foundInPOs = true;
            console.log(`⚠️ ENCONTRADO 'escondidinho' na OP (plural) ID: ${doc.id}`);
        }
    });

    if (!foundInPOs) {
        console.log("✅ 'escondidinho' NÃO encontrado na coleção ProductionOrders.");
    }

    process.exit(0);
}

checkEscondidinho().catch(err => {
    console.error(err);
    process.exit(1);
});
