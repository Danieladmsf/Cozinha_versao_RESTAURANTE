
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, query, orderBy, limit } from 'firebase/firestore';

async function main() {
    console.log("🔍 Procurando Ordens de Produção salvas...");

    // As ordens de produção ficam em ProductionOrders ou ProductionOrder
    let ordersRef;
    try {
        ordersRef = collection(db, "ProductionOrder");
    } catch {
        ordersRef = collection(db, "ProductionOrders");
    }

    const snap = await getDocsFromServer(query(ordersRef, orderBy("createdAt", "desc"), limit(5)));

    if (snap.empty) {
        console.log("❌ Nenhuma Ordem de Produção encontrada.");
    } else {
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`\n📅 Ordem: ${doc.id} | Status: ${data.status} | Data: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);

            if (data.items && data.items.length > 0) {
                console.log("  🍽️ Itens encontrados na OP:");
                data.items.forEach(item => {
                    // name, category, quantity
                    console.log(`    - [${item.category || 'Sem Categoria'}] ${item.recipe_name || item.name} (Qtd: ${item.quantity || item.planned_quantity || 1})`);
                });
            } else {
                console.log("  ⚠️ Nenhum item listado nesta OP.");
            }
        });
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
