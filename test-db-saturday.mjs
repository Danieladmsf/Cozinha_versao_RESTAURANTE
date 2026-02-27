// test-db-saturday.js
import admin from 'firebase-admin';

// Initialize Firebase Admin (adjust the service account path if needed, 
// or let it use default application credentials if set)
if (!admin.apps.length) {
    // Try to use the project default. If it fails, we will need the service account key
    admin.initializeApp();
}

const db = admin.firestore();

async function checkSaturday() {
    try {
        const customerId = '30e461f364e5485ea2c8d2334f54eb75'; // Descontão ID from earlier context

        // Let's check if there are SalesHistory documents for Saturdays
        // But since the new model uses store_id, let's just query some SalesHistory
        console.log("Checking SalesHistory for Descontão...");

        const salesRef = db.collection('sales_history')
            .where('storeId', 'in', [1, 2, 3, 4, 5, 23, 24, 25]) // usually vr_store_id
            .limit(5);

        const snapshot = await salesRef.get();
        console.log(`Found ${snapshot.size} sales history documents`);

        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data().date, 'Events:', doc.data().events ? doc.data().events.length : 0);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkSaturday();
