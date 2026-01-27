
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    query,
    where,
    updateDoc,
    writeBatch
} from 'firebase/firestore';

async function consolidateDuplicates() {
    console.log("🛠️ Consolidating duplicates...");

    const treeRef = collection(db, 'CategoryTree');
    const KEEP_ID = 'oGrW7uqleRKBZXMilfs4';
    const DELETE_ID = 'tzovWe6DmMMsucZFqsGP';

    // 1. Move children from DELETE_ID to KEEP_ID
    const qChildren = query(treeRef, where('parent_id', '==', DELETE_ID));
    const childrenSnap = await getDocs(qChildren);

    console.log(`Found ${childrenSnap.size} children to move/check.`);

    for (const child of childrenSnap.docs) {
        // Check if destination (KEEP_ID) already has this child name
        // because we suspect duplicate subcategories too
        const childName = child.data().name;

        const qKeepChild = query(
            treeRef,
            where('parent_id', '==', KEEP_ID),
            where('name', '==', childName)
        );
        const keepChildSnap = await getDocs(qKeepChild);

        if (!keepChildSnap.empty) {
            console.log(`⚠️ Child '${childName}' already exists in target. Checking if we need to merge recipes...`);
            const targetChildId = keepChildSnap.docs[0].id;
            const sourceChildId = child.id;

            if (targetChildId !== sourceChildId) {
                // Determine which ID the recipes are using.
                // If we delete sourceChildId, we must point recipes to targetChildId
                await moveRecipes(sourceChildId, targetChildId);

                // Then delete the duplicate child
                console.log(`🗑️ Deleting duplicate subcategory: ${sourceChildId}`);
                await deleteDoc(doc(db, 'CategoryTree', sourceChildId));
            }
        } else {
            // Just move it
            console.log(`🚚 Moving subcategory '${childName}' (${child.id}) to parent ${KEEP_ID}`);
            await updateDoc(doc(db, 'CategoryTree', child.id), { parent_id: KEEP_ID });
        }
    }

    // 2. Delete the parent duplicate
    console.log(`\n🗑️ Deleting parent duplicate: ${DELETE_ID}`);
    await deleteDoc(doc(db, 'CategoryTree', DELETE_ID));

    console.log("✅ Consolidation complete.");
    process.exit(0);
}

async function moveRecipes(oldCatId, newCatId) {
    const recipesRef = collection(db, 'Recipe');
    const qRecipes = query(recipesRef, where('category_id', '==', oldCatId));
    const recipeSnap = await getDocs(qRecipes);

    console.log(`   found ${recipeSnap.size} recipes using old subcategory ${oldCatId}. Moving to ${newCatId}...`);

    if (recipeSnap.size > 0) {
        const batch = writeBatch(db);
        recipeSnap.forEach(doc => {
            batch.update(doc.ref, { category_id: newCatId });
        });
        await batch.commit();
        console.log(`   ✅ Recipes updated.`);
    }
}

consolidateDuplicates();
