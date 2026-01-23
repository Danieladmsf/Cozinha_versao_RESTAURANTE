
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function fixCakeActiveField() {
    console.log("🩹 Fixing 'active' field for Cake Recipes...");

    const cakeNames = [
        "Bolo de Chocolate Tradicional",
        "Bolo de Cenoura com Chocolate",
        "Bolo de Fubá Cremoso",
        "Bolo de Laranja Molhadinho"
    ];

    try {
        for (const name of cakeNames) {
            const qRecipe = query(collection(db, "Recipe"), where("name", "==", name));
            const snapRecipe = await getDocs(qRecipe);

            if (!snapRecipe.empty) {
                for (const rDoc of snapRecipe.docs) {
                    await updateDoc(doc(db, "Recipe", rDoc.id), {
                        active: true, // This is the field the UI checks
                        status: 'active', // Keeping this for consistency
                        updatedAt: Timestamp.now()
                    });
                    console.log(`✅ Set active=true for '${name}'`);
                }
            } else {
                console.warn(`⚠️ Recipe '${name}' not found.`);
            }
        }

        console.log("🎉 All cakes fully activated!");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixCakeActiveField();
