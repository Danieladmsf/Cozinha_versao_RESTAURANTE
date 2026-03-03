import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
    try {
        const productsSnapshot = await getDocs(collection(db, 'Product'));
        const recipesSnapshot = await getDocs(collection(db, 'Recipe'));

        productsSnapshot.forEach(d => {
            const data = d.data();
            const lower = data.name.toLowerCase();
            if (lower.includes("medalha") || lower.includes("panela") || lower.includes("arroz") || lower.includes("feij")) {
                console.log(`Product: ${data.name} (ID: ${d.id})`);
            }
        });
        recipesSnapshot.forEach(d => {
            const data = d.data();
            const lower = data.name.toLowerCase();
            if (lower.includes("medalha") || lower.includes("panela") || lower.includes("arroz") || lower.includes("feij")) {
                console.log(`Recipe: ${data.name} (ID: ${d.id})`);
            }
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
