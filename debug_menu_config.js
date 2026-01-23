
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function debugMenuConfig() {
    console.log("⚙️ Debugging Menu Config...");

    try {
        // Mock User ID used in code is 'mock-user-id' usually, but data says user_id field.
        // APP_CONSTANTS.MOCK_USER_ID is usually "1" or similar in dev.
        // Let's just list all configs.

        const snaps = await getDocs(collection(db, "MenuConfig"));
        if (snaps.empty) {
            console.log("No MenuConfig found.");
        } else {
            const config = snaps.docs[0].data(); // Assuming single config
            console.log("Config ID:", snaps.docs[0].id);
            console.log("Active Categories:", JSON.stringify(config.active_categories, null, 2));

            // Get Confeitária ID from Category collection
            const qCat = query(collection(db, "Category"), where("name", "==", "Confeitária"));
            const sCat = await getDocs(qCat);
            if (!sCat.empty) {
                const confId = sCat.docs[0].id;
                console.log(`\n🆔 New 'Confeitária' Category ID: ${confId}`);
                console.log(`Is Active in Config? ${config.active_categories?.[confId]}`);
            } else {
                console.log("⚠️ Category 'Confeitária' not found in DB.");
            }
        }
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

debugMenuConfig();
