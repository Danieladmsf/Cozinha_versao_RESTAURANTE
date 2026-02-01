/**
 * Script para verificar pedidos (Orders) no Firebase
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log('='.repeat(80));
    console.log('VERIFICANDO PEDIDOS (ORDER)');
    console.log('='.repeat(80));

    // 1. Verificar coleção Order
    const orderSnap = await db.collection('Order').get();
    console.log(`\n📦 Order: ${orderSnap.size} documentos`);

    if (orderSnap.size > 0) {
        console.log('\n  Últimos 5 pedidos:');
        let count = 0;
        orderSnap.forEach(doc => {
            if (count < 5) {
                const data = doc.data();
                console.log(`    - ${data.customer_name || 'Sem cliente'} | Semana ${data.week_number}/${data.year} | Dia ${data.day_of_week}`);
                console.log(`      Items: ${data.items?.length || 0}`);
                count++;
            }
        });
    }

    // 2. Verificar semana atual (4 de 2026)
    const currentWeekOrders = await db.collection('Order')
        .where('week_number', '==', 4)
        .where('year', '==', 2026)
        .get();

    console.log(`\n📅 Pedidos da Semana 4/2026: ${currentWeekOrders.size}`);

    console.log('\n' + '='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
