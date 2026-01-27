
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    limit
} from 'firebase/firestore';

async function verifyImport() {
    console.log("🔍 Verifying Rotisseria Import...");

    // 1. Find the Category ID
    const catQuery = query(collection(db, 'Category'), where('name', '==', 'PRODUCAO - ROTISSERIA'));
    const catDocs = await getDocs(catQuery);

    if (catDocs.empty) {
        console.error("❌ Category 'PRODUCAO - ROTISSERIA' not found!");
        process.exit(1);
    }

    const catId = catDocs.docs[0].id;
    console.log(`✅ Category Found: ${catId}`);

    // 2. Count Recipes in this Category
    const recipesRef = collection(db, 'recipes');
    const qRecipes = query(recipesRef, where('category_id', '==', catId));
    const recipeDocs = await getDocs(qRecipes);

    console.log(`✅ Found ${recipeDocs.size} recipes in category.`);

    if (recipeDocs.size > 0) {
        console.log("📝 Sample items:");
        recipeDocs.docs.slice(0, 5).forEach(doc => {
            const data = doc.data();
            console.log(` - [${data.unit_type}] ${data.name} (Search: ${data.search_name})`);
        });
    }

    process.exit(0);
}

verifyImport();
