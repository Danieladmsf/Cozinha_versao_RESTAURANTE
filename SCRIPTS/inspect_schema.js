
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    limit,
    query
} from 'firebase/firestore';

async function inspectSchema() {
    console.log("🔍 Inspecting Recipe Schema...");

    const recipeRef = collection(db, 'Recipe');
    const recipeDocs = await getDocs(query(recipeRef, limit(1)));

    if (recipeDocs.size > 0) {
        console.log("Sample 'Recipe' doc data:", JSON.stringify(recipeDocs.docs[0].data(), null, 2));
    }

    process.exit(0);
}

inspectSchema();
