import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function extract() {
    const snap = await getDocs(collection(db, 'Recipe'));
    let m;
    snap.forEach(d => { if (d.id === 'nmxkeGr347IF0BUBXyeJ') m = d.data() });
    delete m.preparations;
    console.log(JSON.stringify(m, null, 2));
}

extract().then(() => process.exit(0)).catch(console.error);
