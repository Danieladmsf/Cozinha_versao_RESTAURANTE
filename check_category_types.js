
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs
} from 'firebase/firestore';

async function checkCategoryTypes() {
    console.log("🔍 Checking Category Types...");

    try {
        const snap = await getDocs(collection(db, "CategoryType"));
        snap.forEach(doc => {
            const d = doc.data();
            console.log(`- Label: "${d.label}", Value: "${d.value}"`);
        });

        console.log("\n🔍 Checking existing 'Padaria' categories...");
        const catSnap = await getDocs(collection(db, "Category"));
        catSnap.forEach(doc => {
            const d = doc.data();
            if (d.name === 'Padaria') {
                console.log(`- Found 'Padaria': ID=${doc.id}, Type=${d.type}, Parent=${d.parentId}`);
            }
        });

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

checkCategoryTypes();
