import { db } from '../lib/firebase.js';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

async function fix() {
    try {
        console.log("Reading data from injected doc...");
        const badDocRef = doc(db, 'WeeklyMenu', 'menu_1772408972313');
        const badSnap = await getDoc(badDocRef);

        if (!badSnap.exists()) {
            console.log("Injected doc already deleted or missing.");
            process.exit(0);
        }

        const badData = badSnap.data();

        console.log("Applying data to correct UI document: p5rHQldhlVXvOB4QT12W");
        const goodDocRef = doc(db, 'WeeklyMenu', 'p5rHQldhlVXvOB4QT12W');
        const goodSnap = await getDoc(goodDocRef);
        const goodData = goodSnap.exists() ? goodSnap.data() : { week_key: '2026-W9' };

        // Merge the populated menu_data
        const updatedData = {
            ...goodData,
            menu_data: badData.menu_data,
            updatedAt: new Date().toISOString()
        };

        await setDoc(goodDocRef, updatedData);
        console.log("Correct document updated successfully!");

        // Clean up the wrong document
        console.log("Deleting injected stray document...");
        await deleteDoc(badDocRef);

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
