// Quick check of existing active recipe structure
import { db } from '../lib/firebase.js';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

async function check() {
    const snap = await getDocs(query(collection(db, 'Recipe'), where('active', '==', true), limit(3)));

    if (snap.empty) {
        console.log("No active recipes found");
    } else {
        snap.docs.forEach(doc => {
            const data = doc.data();
            console.log("=".repeat(50));
            console.log("Name:", data.name);
            console.log("Category:", data.category);
            console.log("Active:", data.active);
            console.log("Status:", data.status);
        });
    }

    process.exit(0);
}

check();
