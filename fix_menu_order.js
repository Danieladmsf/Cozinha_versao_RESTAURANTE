
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    where
} from 'firebase/firestore';

async function fixMenuOrder() {
    console.log("🔧 Fixing Menu Config Order...");

    try {
        // 1. Get New Confeitária ID
        const qCat = query(collection(db, "Category"), where("name", "==", "Confeitária"));
        const sCat = await getDocs(qCat);

        if (sCat.empty) {
            console.error("❌ 'Confeitária' category not found.");
            process.exit(1);
        }

        const confId = sCat.docs[0].id;
        console.log(`✅ Found 'Confeitária': ${confId}`);

        // 2. Update MenuConfig
        const snaps = await getDocs(collection(db, "MenuConfig"));
        if (!snaps.empty) {
            const configDoc = snaps.docs[0];
            const data = configDoc.data();
            let currentOrder = data.category_order || [];

            if (!currentOrder.includes(confId)) {
                // Append to the end
                currentOrder.push(confId);

                await updateDoc(doc(db, "MenuConfig", configDoc.id), {
                    category_order: currentOrder
                });
                console.log(`✅ Updated MenuConfig Order (ID: ${configDoc.id}). Added ${confId}.`);
            } else {
                console.log("⚠️ Category already in order list.");
            }
        }

        console.log("🎉 Fix applied: Category added to sort order.");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixMenuOrder();
