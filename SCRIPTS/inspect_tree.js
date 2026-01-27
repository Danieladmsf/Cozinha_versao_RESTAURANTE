
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function inspectCategoryTree() {
    console.log("🔍 Inspecting CategoryTree...");

    const treeRef = collection(db, 'CategoryTree');

    // Check for ROTISSERIA
    const qRot = query(treeRef, where('name', '==', 'ROTISSERIA'));
    const rotSnap = await getDocs(qRot);

    if (rotSnap.empty) {
        console.log("❌ 'ROTISSERIA' NOT found in CategoryTree.");
        // Try case insensitive or just check all level 1
        console.log("Checking all Level 1...");
        const qLvl1 = query(treeRef, where('level', '==', 1));
        const lvl1Snap = await getDocs(qLvl1);
        lvl1Snap.forEach(doc => {
            console.log(` - Level 1: ${doc.data().name} (ID: ${doc.id}, Type: ${doc.data().type})`);
        });
    } else {
        const rotDoc = rotSnap.docs[0];
        console.log(`✅ 'ROTISSERIA' FOUND in CategoryTree.`);
        console.log(`   ID: ${rotDoc.id}`);
        console.log(`   Data:`, rotDoc.data());

        // Check for children
        const qChild = query(treeRef, where('parent_id', '==', rotDoc.id));
        const childSnap = await getDocs(qChild);
        console.log(`   Found ${childSnap.size} children in CategoryTree.`);
        childSnap.forEach(c => console.log(`    -> ${c.data().name}`));
    }

    process.exit(0);
}

inspectCategoryTree();
