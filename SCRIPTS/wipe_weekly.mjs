import { db } from '../lib/firebase.js';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
async function wipe() {
    const snap = await getDocs(collection(db, 'WeeklyMenu'));
    for (const d of snap.docs) { await deleteDoc(d.ref); console.log('Deleted:', d.id); }
    console.log('Collection limpa!');
    process.exit(0);
}
wipe();
