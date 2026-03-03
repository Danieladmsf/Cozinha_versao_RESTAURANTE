import { db } from '../lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

async function check() {
    try {
        const docRef = doc(db, 'WeeklyMenu', 'p5rHQldhlVXvOB4QT12W');
        const snap = await getDoc(docRef);
        const data = snap.data();

        fs.writeFileSync('weekly_menu_dump.json', JSON.stringify(data, null, 2));
        console.log("Dump saved to weekly_menu_dump.json");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
