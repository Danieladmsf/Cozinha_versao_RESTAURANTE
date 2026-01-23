
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc
} from 'firebase/firestore';

async function fixSeed() {
    console.log("Starting fix process...");

    try {
        const ingredientsToFix = [
            { name: "Alcatra Peça", category: "Bovinos" },
            { name: "Peito de Frango", category: "Aves" },
            { name: "Costelinha", category: "Suínos" }
        ];

        for (const item of ingredientsToFix) {
            const q = query(collection(db, "Ingredient"), where("name", "==", item.name));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const docRef = doc(db, "Ingredient", docSnap.id);

                console.log(`Updating ${item.name}...`);
                await updateDoc(docRef, {
                    category: item.category,
                    last_update: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    updatedAt: new Date()
                });
                console.log(`✅ Updated ${item.name} with category "${item.category}"`);
            } else {
                console.log(`⚠️ Ingredient ${item.name} not found.`);
            }
        }

        console.log("\nFix process completed!");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("Fix failed:", error);
        process.exit(1);
    }
}

fixSeed();
