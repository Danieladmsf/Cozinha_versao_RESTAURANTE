import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkCategories() {
    try {
        console.log("Fetching CategoryTree...");
        const catSnap = await getDocs(collection(db, 'CategoryTree'));

        const allCategories = [];
        catSnap.forEach(d => {
            allCategories.push({ id: d.id, ...d.data() });
        });

        console.log(`\n=== ALL CATEGORIES (${allCategories.length}) ===`);
        allCategories.forEach(c => {
            console.log(`- ID: ${c.id} | Name: ${c.name} | Type: ${c.type} | Parent: ${c.parentId}`);
        });

        const targetCategories = [
            "PRODUTOS",
            "COMIDA JAPONESA",
            "CONFEITÁRIA",
            "PROCESSADOS - FLV"
        ];

        console.log(`\n=== CHECKING TARGET CATEGORIES ===`);
        for (const target of targetCategories) {
            const found = allCategories.find(c => c.name && c.name.toUpperCase() === target.toUpperCase());
            if (found) {
                console.log(`✅ FOUND: ${target} (ID: ${found.id}, Type: ${found.type})`);
            } else {
                console.log(`❌ NOT FOUND: ${target}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkCategories();
