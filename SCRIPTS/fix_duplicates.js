
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';

async function fixDuplicates() {
    console.log("🔍 Inspecting children of duplicates...");

    const treeRef = collection(db, 'CategoryTree');
    // IDs found: oGrW7uqleRKBZXMilfs4, tzovWe6DmMMsucZFqsGP
    const ids = ['oGrW7uqleRKBZXMilfs4', 'tzovWe6DmMMsucZFqsGP'];

    for (const id of ids) {
        const qChild = query(treeRef, where('parent_id', '==', id));
        const childSnap = await getDocs(qChild);
        console.log(`ID ${id} has ${childSnap.size} children.`);
        childSnap.forEach(c => console.log(`   -> Child: ${c.data().name}`));

        if (childSnap.size === 0) {
            console.log(`🗑️ Deleting empty duplicate: ${id}`);
            await deleteDoc(doc(db, 'CategoryTree', id));
        } else {
            console.log(`✅ Keeping active category: ${id}`);
        }
    }

    process.exit(0);
}

fixDuplicates();
