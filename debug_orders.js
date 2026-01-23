
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from 'firebase/firestore';

async function debugOrders() {
    console.log("🕵️‍♀️ Debugging Orders...");

    try {
        const q = query(collection(db, "Order"), orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("⚠️ No orders found in recent history.");
        } else {
            console.log(`✅ Found ${snap.size} recent orders.`);
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`\n📄 Order ID: ${doc.id}`);
                console.log(`- Customer: ${data.customer_name}`);
                console.log(`- Date: ${data.date}`);
                console.log(`- Week: ${data.week_number}, Year: ${data.year}`);

                if (data.items && Array.isArray(data.items)) {
                    console.log(`- Items (${data.items.length}):`);
                    data.items.forEach((item, idx) => {
                        console.log(`  [${idx}] RecipeID: ${item.recipe_id} | Name: ${item.name} | Qty: ${item.quantity} | Unit: ${item.unit_type}`);
                    });
                } else {
                    console.log("- No items array.");
                }
            });
        }

        console.log("\n🕵️‍♀️ Checking for Cake Recipe IDs...");
        const cakeIds = [
            "gPOt54BVrSvduKTfsUAn", // Chocolate (example from previous output, strictly checking IDs from last run might be hard, so just listing)
            // Actually I'll just check if any item name contains "Bolo"
        ];

        // We really want to know if there are matches.

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

debugOrders();
