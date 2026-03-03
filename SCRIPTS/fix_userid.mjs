import { db } from '../lib/firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

async function fix() {
    await updateDoc(doc(db, 'WeeklyMenu', 'p5rHQldhlVXvOB4QT12W'), { user_id: 'mock-user-id' });
    console.log('user_id adicionado!');
    process.exit(0);
}
fix();
