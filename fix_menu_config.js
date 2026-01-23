
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    where
} from 'firebase/firestore';

async function fixMenuConfig() {
    console.log("🔧 Fixing Menu Config...");

    try {
        // 1. Get New Confeitária ID
        const qCat = query(collection(db, "Category"), where("name", "==", "Confeitária"));
        const sCat = await getDocs(qCat);

        if (sCat.empty) {
            console.error("❌ 'Confeitária' category not found.");
            process.exit(1);
        }

        const confId = sCat.docs[0].id;
        console.log(`✅ Found 'Confeitária': ${confId}`);

        // 2. Update MenuConfig
        const snaps = await getDocs(collection(db, "MenuConfig"));
        if (!snaps.empty) {
            const configDoc = snaps.docs[0];
            const currentActive = configDoc.data().active_categories || {};

            // Set to true
            currentActive[confId] = true;

            // Also ensure Padaria (parent) is true?
            // Usually parent activation isn't strictly required if child is active, but safe to check.

            await updateDoc(doc(db, "MenuConfig", configDoc.id), {
                active_categories: currentActive
            });
            console.log(`✅ Updated MenuConfig (ID: ${configDoc.id}) to activate 'Confeitária'.`);
        }

        console.log("🎉 Fix applied relative to category visibility.");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixMenuConfig();
