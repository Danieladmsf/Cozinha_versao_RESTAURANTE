
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    setDoc,
    doc,
    query,
    where
} from 'firebase/firestore';

async function syncConfeitariaTree() {
    console.log("🌳 Syncing 'Confeitária' to CategoryTree...");

    try {
        // 1. Get from Category
        const qCat = query(collection(db, "Category"), where("name", "==", "Confeitária"));
        const sCat = await getDocs(qCat);

        if (sCat.empty) {
            console.error("❌ 'Confeitária' not found in Category.");
            process.exit(1);
        }

        const catDoc = sCat.docs[0];
        const catData = catDoc.data();
        const catId = catDoc.id;

        console.log(`✅ Found Source in Category: ${catId} (${catData.name})`);

        // 2. Write to CategoryTree
        // Ensure it is Level 1 to show up in the Shopping List filter (cat.level === 1)
        const treeData = {
            ...catData,
            updatedAt: new Date(), // Timestamp
            // active: true // Already in catData
        };

        await setDoc(doc(db, "CategoryTree", catId), treeData);
        console.log(`✅ Synced to CategoryTree: ${catId}`);

        // 3. Just in case, check Padaria parent
        // If Confeitaria is Level 1, maybe Padaria is Level 0?
        // But for Shopping List, it filters Level 1. So Confeitaria works as "Main Category" for ingredients.

        console.log("🎉 Sync Complete.");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

syncConfeitariaTree();
