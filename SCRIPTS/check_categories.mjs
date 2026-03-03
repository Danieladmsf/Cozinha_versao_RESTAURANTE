import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
    try {
        const snap = await getDocs(collection(db, 'CategoryTree'));
        console.log("CategoryTree Map:");
        snap.forEach(d => {
            const data = d.data();
            console.log(`${d.id} -> ${data.name}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
