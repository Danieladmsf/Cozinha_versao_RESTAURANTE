import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkMenuConfig() {
    try {
        console.log("Fetching MenuConfig...");
        const confSnap = await getDocs(collection(db, 'MenuConfig'));

        confSnap.forEach(d => {
            console.log(`\n=== Doc ID: ${d.id} ===`);
            console.log(JSON.stringify(d.data(), null, 2));
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkMenuConfig();
