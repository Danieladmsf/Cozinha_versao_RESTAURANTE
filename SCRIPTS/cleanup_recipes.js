
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    deleteDoc,
    query,
    where,
    limit,
    writeBatch
} from 'firebase/firestore';

async function cleanupRecipes() {
    console.log("🧹 Cleanup 'recipes' (wrong collection)...");

    const recipesRef = collection(db, 'recipes');
    // We only want to delete the ones we just imported.
    // We know they have category_id from our previous script.
    // Or we can delete all if we are sure 'recipes' is unused.
    // Based on previous checks, 'Recipe' is the main one. 'recipes' had ~600 docs which matches our import.

    // Safer to query by the category ID we created: 'PRODUCAO - ROTISSERIA'
    // But I don't have the ID handy unless I query it.

    const catQuery = query(collection(db, 'Category'), where('name', '==', 'PRODUCAO - ROTISSERIA'));
    const catSnapshot = await getDocs(catQuery);

    if (catSnapshot.empty) {
        console.log("Category not found, maybe no need to cleanup?");
    } else {
        const catId = catSnapshot.docs[0].id;
        console.log(`Targeting cleanup for CategoryID: ${catId}`);

        const qToDelete = query(recipesRef, where('category_id', '==', catId));
        const snapshot = await getDocs(qToDelete);

        console.log(`Found ${snapshot.size} docs to delete in 'recipes'.`);

        if (snapshot.size > 0) {
            let batch = writeBatch(db);
            let counter = 0;
            let totalDeleted = 0;

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                counter++;

                if (counter >= 400) {
                    await batch.commit();
                    totalDeleted += counter;
                    console.log(`Deleted batch of ${counter}`);
                    counter = 0;
                    batch = writeBatch(db); // Create new batch
                }
            }

            if (counter > 0) {
                await batch.commit();
                totalDeleted += counter;
                console.log(`Deleted final batch of ${counter}`);
            }
            console.log(`Total deleted: ${totalDeleted}`);
        }
    }

    process.exit(0);
}

cleanupRecipes();
