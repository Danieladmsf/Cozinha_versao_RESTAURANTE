
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where
} from 'firebase/firestore';
import fs from 'fs';

async function inspectTestBolo() {
    console.log("🕵️‍♀️ Inspecting 'teste bolo'...");

    try {
        // 1. Find Recipe
        const q = query(collection(db, "Recipe"), where("name", "==", "teste bolo"));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("❌ 'teste bolo' not found.");
            process.exit(0);
        }

        const recipeDoc = snap.docs[0];
        const rData = recipeDoc.data();

        // 2. Inspect its Category
        let categoryData = null;
        let parentCategoryData = null;

        if (rData.category_id) {
            const catRef = doc(db, "Category", rData.category_id);
            const catSnap = await getDoc(catRef);
            if (catSnap.exists()) {
                categoryData = catSnap.data();
                categoryData.id = catSnap.id;

                // 3. Inspect Parent Category if exists
                if (categoryData.parentId) {
                    const parentRef = doc(db, "Category", categoryData.parentId);
                    const parentSnap = await getDoc(parentRef);
                    if (parentSnap.exists()) {
                        parentCategoryData = parentSnap.data();
                        parentCategoryData.id = parentSnap.id;
                    }
                }
            }
        }

        const fullDump = {
            _recipeId: recipeDoc.id,
            recipe: rData,
            category: categoryData,
            parentCategory: parentCategoryData
        };

        const jsonOutput = JSON.stringify(fullDump, null, 2);
        fs.writeFileSync('test_bolo_structure.json', jsonOutput);
        console.log("✅ Dump saved to test_bolo_structure.json");

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

inspectTestBolo();
