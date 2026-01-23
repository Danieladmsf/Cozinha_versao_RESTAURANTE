
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs
} from 'firebase/firestore';

async function debugCategoryTree() {
    console.log("🌳 Debugging CategoryTree...");

    try {
        const snap = await getDocs(collection(db, "CategoryTree"));
        if (snap.empty) {
            console.log("⚠️ CategoryTree collection is EMPTY.");
        } else {
            console.log(`✅ Found ${snap.size} docs in CategoryTree.`);
            snap.forEach(doc => {
                const d = doc.data();
                console.log(`- [${doc.id}] ${d.name} (Level: ${d.level}, Type: ${d.type})`);
            });
        }

        console.log("\n📁 Checking Category collection for comparison...");
        const catSnap = await getDocs(collection(db, "Category"));
        console.log(`✅ Found ${catSnap.size} docs in Category.`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

debugCategoryTree();
