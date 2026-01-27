
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function checkDuplicates() {
    console.log("🔍 Checking Duplicate Categories...");

    const treeRef = collection(db, 'CategoryTree');
    // Check for ROTISSERIA in CategoryTree
    const qRot = query(treeRef, where('name', '==', 'ROTISSERIA'));
    const rotSnap = await getDocs(qRot);

    console.log(`Found ${rotSnap.size} occurences of 'ROTISSERIA' in CategoryTree:`);
    rotSnap.forEach(d => {
        console.log(` - [CategoryTree] ID: ${d.id} | Level: ${d.data().level} | Type: ${d.data().type}`);
    });


    const catRef = collection(db, 'Category');
    // Check for ROTISSERIA in Category
    const qCat = query(catRef, where('name', '==', 'ROTISSERIA'));
    const catSnap = await getDocs(qCat);
    console.log(`\nFound ${catSnap.size} occurences of 'ROTISSERIA' in Category:`);
    catSnap.forEach(d => {
        console.log(` - [Category] ID: ${d.id} | Level: ${d.data().level} | Type: ${d.data().type}`);
    });

    process.exit(0);
}

checkDuplicates();
