
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs
} from 'firebase/firestore';

async function debugFullMenuConfig() {
    console.log("⚙️ Debugging FULL Menu Config...");

    try {
        const snaps = await getDocs(collection(db, "MenuConfig"));
        if (snaps.empty) {
            console.log("No MenuConfig found.");
        } else {
            const config = snaps.docs[0].data();
            console.log("Config ID:", snaps.docs[0].id);
            console.log("Category Order:", JSON.stringify(config.category_order, null, 2));
            console.log("Selected Main Categories:", JSON.stringify(config.selected_main_categories, null, 2));
            console.log("Active Categories Keys:", Object.keys(config.active_categories || {}));
        }
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

debugFullMenuConfig();
