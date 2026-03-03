import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
    try {
        const snap = await getDocs(collection(db, 'MenuConfig'));
        const config = snap.docs[0].data();

        console.log("Config category groups:", JSON.stringify(config.category_groups, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
