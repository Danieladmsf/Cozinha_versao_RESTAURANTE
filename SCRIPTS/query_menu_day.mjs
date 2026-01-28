import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCvoMkdHB6PlGu9I3Lciqlcd13zYhbHgxY",
    authDomain: "controle-de-estoque-ab42c.firebaseapp.com",
    projectId: "controle-de-estoque-ab42c",
    storageBucket: "controle-de-estoque-ab42c.firebasestorage.app",
    messagingSenderId: "365318581498",
    appId: "1:365318581498:web:48d53c4b40abcc37b25ee6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function queryMenuForDate() {
    const targetDate = '2025-01-19';

    console.log(`\n🔍 Buscando cardápio para: ${targetDate}\n`);
    console.log('='.repeat(60));

    try {
        // Try MenuConfig collection
        const menuConfigRef = collection(db, 'MenuConfig');
        const menuConfigSnapshot = await getDocs(menuConfigRef);
        console.log(`📁 MenuConfig: ${menuConfigSnapshot.size} documentos`);

        // Try Menu collection  
        const menuRef = collection(db, 'Menu');
        const menuSnapshot = await getDocs(menuRef);
        console.log(`📁 Menu: ${menuSnapshot.size} documentos`);

        // Try DailyMenu collection
        const dailyRef = collection(db, 'DailyMenu');
        const dailySnapshot = await getDocs(dailyRef);
        console.log(`📁 DailyMenu: ${dailySnapshot.size} documentos`);

        // Check Order collection for that date
        const ordersRef = collection(db, 'Order');
        const ordersSnapshot = await getDocs(ordersRef);
        console.log(`📁 Order: ${ordersSnapshot.size} documentos`);

        // Filter orders for Jan 19, 2025
        let ordersForDate = [];
        ordersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.date === targetDate || data.delivery_date === targetDate) {
                ordersForDate.push({ id: doc.id, ...data });
            }
        });

        console.log(`\n📋 Pedidos para ${targetDate}: ${ordersForDate.length}`);

        if (ordersForDate.length > 0) {
            ordersForDate.forEach(order => {
                console.log(`\n   📦 Pedido ID: ${order.id}`);
                console.log(`      Cliente: ${order.customer_name || order.customer_id || 'N/A'}`);
                console.log(`      Status: ${order.status || 'N/A'}`);
                if (order.items && order.items.length > 0) {
                    console.log(`      Itens: ${order.items.length}`);
                    order.items.slice(0, 5).forEach((item, idx) => {
                        console.log(`        ${idx + 1}. ${item.recipe_name || item.name || 'N/A'} - Qty: ${item.quantity || 'N/A'}`);
                    });
                    if (order.items.length > 5) {
                        console.log(`        ... e mais ${order.items.length - 5} itens`);
                    }
                }
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }

    process.exit(0);
}

queryMenuForDate();
