import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function listAllCategories() {
    console.log("🔍 Listando todas as categorias...");
    const snap = await getDocs(collection(db, 'Category'));
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (ID: ${doc.id}, Type: ${data.type})`);
    });
    process.exit(0);
}

listAllCategories().catch(err => {
    console.error(err);
    process.exit(1);
});
