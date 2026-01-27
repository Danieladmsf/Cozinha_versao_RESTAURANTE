
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    limit,
    query
} from 'firebase/firestore';

async function checkCollections() {
    console.log("🔍 Checking Collections...");

    // Check 'Recipe'
    const recipeRef = collection(db, 'Recipe');
    const recipeDocs = await getDocs(query(recipeRef, limit(5)));
    console.log(`\n📂 Collection 'Recipe': ${recipeDocs.size} docs found`);
    if (recipeDocs.size > 0) {
        console.log("Sample 'Recipe' doc:", recipeDocs.docs[0].data().name);
    }

    // Check 'recipes'
    const recipesRef = collection(db, 'recipes');
    const recipesDocs = await getDocs(query(recipesRef, limit(5)));
    console.log(`\n📂 Collection 'recipes': ${recipesDocs.size} docs found`);
    if (recipesDocs.size > 0) {
        console.log("Sample 'recipes' doc:", recipesDocs.docs[0].data().name);
    }

    process.exit(0);
}

checkCollections();
