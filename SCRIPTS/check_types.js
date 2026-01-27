
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs
} from 'firebase/firestore';

async function checkCategoryTypes() {
    console.log("🔍 Checking CategoryType...");

    const typesRef = collection(db, 'CategoryType');
    const snapshot = await getDocs(typesRef);

    snapshot.forEach(doc => {
        console.log(` - ID: ${doc.id} | Data:`, doc.data());
    });

    // Also check one of the visible categories in 'Produtos' tab if possible.
    // E.g. 'PADARIA E INDUSTRIALIZADOS'
    console.log("\n🔍 Checking 'PADARIA E INDUSTRIALIZADOS' category...");
    const catRef = collection(db, 'Category');
    const catSnapshot = await getDocs(collection(db, 'Category')); // Get all to filter in memory or query
    // Filtering 
    const padaria = catSnapshot.docs.find(d => d.data().name === 'PADARIA E INDUSTRIALIZADOS');
    if (padaria) {
        console.log("PADARIA E INDUSTRIALIZADOS:", padaria.data());
    }

    process.exit(0);
}

checkCategoryTypes();
