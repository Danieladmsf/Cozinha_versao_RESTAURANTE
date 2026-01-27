
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    writeBatch
} from 'firebase/firestore';

async function fixTypes() {
    console.log("🛠️ Fixing Types...");

    const TARGET_TYPE = 'receitas_-_base';

    // 1. Fix CategoryTree
    const treeRef = collection(db, 'CategoryTree');
    // Find ROTISSERIA
    const qRot = query(treeRef, where('name', '==', 'ROTISSERIA'));
    const rotSnap = await getDocs(qRot);

    if (!rotSnap.empty) {
        const rotDoc = rotSnap.docs[0];
        console.log(`Updating CategoryTree 'ROTISSERIA' (${rotDoc.id}) to type '${TARGET_TYPE}'...`);
        await updateDoc(doc(db, 'CategoryTree', rotDoc.id), { type: TARGET_TYPE });

        // Find Children (PRODUCAO - ROTISSERIA)
        const qChild = query(treeRef, where('parent_id', '==', rotDoc.id));
        const childSnap = await getDocs(qChild);
        childSnap.forEach(async c => {
            console.log(`Updating CategoryTree child '${c.data().name}' (${c.id}) to type '${TARGET_TYPE}'...`);
            await updateDoc(doc(db, 'CategoryTree', c.id), { type: TARGET_TYPE });
        });
    } else {
        console.warn("⚠️ 'ROTISSERIA' not found in CategoryTree. Skipping tree update.");
    }

    // 2. Fix Recipes
    const recipesRef = collection(db, 'Recipe');
    const qRecipes = query(recipesRef, where('category', '==', 'PRODUCAO - ROTISSERIA'));
    const recipeSnap = await getDocs(qRecipes);

    console.log(`Found ${recipeSnap.size} recipes to update to type '${TARGET_TYPE}'...`);

    if (recipeSnap.size > 0) {
        let batch = writeBatch(db);
        let counter = 0;
        let totalUpdated = 0;

        for (const rDoc of recipeSnap.docs) {
            batch.update(rDoc.ref, { type: TARGET_TYPE });
            counter++;

            if (counter >= 400) {
                await batch.commit();
                totalUpdated += counter;
                console.log(`Updated batch of ${counter}`);
                counter = 0;
                batch = writeBatch(db);
            }
        }

        if (counter > 0) {
            await batch.commit();
            totalUpdated += counter;
        }
        console.log(`✅ Total Recipes Updated: ${totalUpdated}`);
    }

    process.exit(0);
}

fixTypes();
