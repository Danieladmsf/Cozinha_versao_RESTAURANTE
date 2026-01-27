
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    limit
} from 'firebase/firestore';

async function verifyRecipeCollection() {
    console.log("🔍 Verifying 'Recipe' Collection...");

    const recipesRef = collection(db, 'Recipe');
    // Query by the string category field which we suspect was missing
    const qRecipes = query(
        recipesRef,
        where('category', '==', 'PRODUCAO - ROTISSERIA'),
        limit(5)
    );

    const recipeDocs = await getDocs(qRecipes);

    console.log(`✅ Found ${recipeDocs.size} sample recipes in 'Recipe'.`);

    if (recipeDocs.size > 0) {
        console.log("📝 Sample items:");
        recipeDocs.docs.forEach(doc => {
            const data = doc.data();
            console.log(` - [${data.type}] ${data.name} (Cat: ${data.category})`);
        });
    } else {
        console.log("❌ No recipes found with category 'PRODUCAO - ROTISSERIA' in 'Recipe'.");
    }

    process.exit(0);
}

verifyRecipeCollection();
