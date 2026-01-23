
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function fixCakeCategories() {
    console.log("🛠️ Fixing Cake Categories...");

    try {
        // 1. Ensure 'Padaria' (Root Category)
        let padariaID;
        const qPadaria = query(collection(db, "Category"), where("name", "==", "Padaria"));
        const snapPadaria = await getDocs(qPadaria);

        if (snapPadaria.empty) {
            console.log("Creating 'Padaria' category...");
            const ref = await addDoc(collection(db, "Category"), {
                name: "Padaria",
                parentId: null,
                level: 0,
                type: 'recipe', // Assuming recipe type based on context
                active: true,
                createdAt: Timestamp.now()
            });
            padariaID = ref.id;
        } else {
            padariaID = snapPadaria.docs[0].id;
            console.log(`Found 'Padaria' (${padariaID})`);
        }

        // 2. Ensure 'Confeitaria' (Sub-category of Padaria)
        let confeitariaID;
        const qConfeitaria = query(
            collection(db, "Category"),
            where("name", "==", "Confeitaria"),
            where("parentId", "==", padariaID)
        );
        const snapConfeitaria = await getDocs(qConfeitaria);

        if (snapConfeitaria.empty) {
            console.log("Creating 'Confeitaria' sub-category...");
            const ref = await addDoc(collection(db, "Category"), {
                name: "Confeitaria",
                parentId: padariaID,
                level: 1,
                type: 'recipe',
                active: true,
                createdAt: Timestamp.now()
            });
            confeitariaID = ref.id;
        } else {
            confeitariaID = snapConfeitaria.docs[0].id;
            console.log(`Found 'Confeitaria' (${confeitariaID})`);
        }

        // 3. Update Recipes
        const cakeNames = [
            "Bolo de Chocolate Tradicional",
            "Bolo de Cenoura com Chocolate",
            "Bolo de Fubá Cremoso",
            "Bolo de Laranja Molhadinho"
        ];

        for (const name of cakeNames) {
            const qRecipe = query(collection(db, "Recipe"), where("name", "==", name));
            const snapRecipe = await getDocs(qRecipe);

            if (!snapRecipe.empty) {
                // Determine which doc to update (take latest if duplicates, or all)
                // Assuming mostly unique or just created one.
                for (const rDoc of snapRecipe.docs) {
                    await updateDoc(doc(db, "Recipe", rDoc.id), {
                        category: "Confeitaria",
                        // Some systems allow category_id, others rely on name string matches. 
                        // To be safe, adding category_id if the schema supports it, 
                        // but standardizing on name 'Confeitaria'.
                        category_id: confeitariaID,
                        updatedAt: Timestamp.now()
                    });
                    console.log(`✅ Updated '${name}' -> Confeitaria`);
                }
            } else {
                console.warn(`⚠️ Recipe '${name}' not found.`);
            }
        }

        console.log("🎉 Done!");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixCakeCategories();
