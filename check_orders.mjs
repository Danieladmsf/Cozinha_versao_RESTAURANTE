import { db } from './lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Buscando Pedidos...");
    // Just fetch some orders for week 10, year 2026 (based on user image showing Semana 10, 01/03 - 07/03)
    const q1 = query(collection(db, "Order"), where("week_number", "==", 10), where("year", "==", 2026));
    const snap1 = await getDocs(q1);

    let itemsFound = 0;
    snap1.forEach(d => {
        const order = d.data();
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (item.recipe_name && item.recipe_name.includes("Arroz Branco")) {
                    console.log(`Pedido ID: ${d.id}, Cliente: ${order.customer_name}`);
                    console.log("Item:", item);
                    itemsFound++;
                }
            });
        }
    });

    if (itemsFound === 0) {
        console.log("Aviso: Nenhum item de Arroz Branco encontrado. Buscando por texto amplo...");
        snap1.forEach(d => {
            const order = d.data();
            if (order.items) {
                order.items.forEach(item => {
                    if (item.recipe_name && item.recipe_name.toLowerCase().includes("arroz")) {
                        console.log(`Encontrado algo similar: ${item.recipe_name} | ID: ${item.recipe_id}`);
                    }
                });
            }
        });
    }

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
