import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

async function run() {
    try {
        const snap = await getDocs(collection(db, 'WeeklyMenu'));
        console.log("Total docs:", snap.size);
        snap.forEach(d => {
            const data = d.data();
            console.log(`Doc: ${d.id}`);
            console.log(`  week_key: ${data.week_key}`);
            console.log(`  week_start: ${data.week_start}`);

            // If this is the document we injected, let's fix it manually to speed things up
            // Week 9 for 2026
            if (data.week_start === '2026-02-22T00:00:00.000Z' || !data.week_key) {
                const newKey = '2026-W9'; // or maybe '2026-W8' or '2026-W10'?
                // Let's check what `date-fns` getWeek starts on.
            }
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
