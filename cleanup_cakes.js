
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where
} from 'firebase/firestore';

async function cleanupCakes() {
    console.log("🧹 Cleaning up Cakes ONLY (Preserving Categories)...");

    const cakeNames = [
        "Bolo de Chocolate Tradicional",
        "Bolo de Cenoura com Chocolate",
        "Bolo de Fubá Cremoso",
        "Bolo de Laranja Molhadinho"
    ];

    try {
        // 1. Delete Recipes
        for (const name of cakeNames) {
            const q = query(collection(db, "Recipe"), where("name", "==", name));
            const snap = await getDocs(q);

            if (!snap.empty) {
                for (const d of snap.docs) {
                    await deleteDoc(doc(db, "Recipe", d.id));
                    console.log(`🗑️ Deleted Recipe: ${name}`);
                }
            } else {
                console.log(`⚠️ Recipe not found (already deleted?): ${name}`);
            }
        }

        // COMMENTED OUT: Do not delete categories, as the user has their own "teste bolo" there now.
        /*
        const catsToDelete = ["Padaria", "Confeitaria"];
        for (const name of catsToDelete) {
             const q = query(collection(db, "Category"), where("name", "==", name));
             const snap = await getDocs(q);
             for (const d of snap.docs) {
                 await deleteDoc(doc(db, "Category", d.id));
                 console.log(`🗑️ Deleted Category: ${name}`);
             }
        }
        */

        console.log("✨ Cleanup Complete.");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

cleanupCakes();
