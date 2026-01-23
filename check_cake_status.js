
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function checkStatus() {
    console.log("🕵️‍♀️ Checking Cake Status...");
    const name = "Bolo de Chocolate Tradicional";

    try {
        const q = query(collection(db, "Recipe"), where("name", "==", name));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log(`❌ Recipe '${name}' NOT found.`);
        } else {
            console.log(`✅ Found ${snap.size} document(s) for '${name}':`);
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`\n📄 ID: ${doc.id}`);
                console.log(`   - status: ${JSON.stringify(data.status)}`);
                console.log(`   - active: ${JSON.stringify(data.active)}`); // Check if there's an 'active' boolean
                console.log(`   - category: ${data.category}`);
                console.log(`   - updatedAt: ${data.updatedAt?.toDate()}`);
            });
        }
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

checkStatus();
