
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    const snap = await getDocsFromServer(collection(db, 'CategoryTree'));
    let count = 0;
    snap.forEach(d => {
        if (d.data().type === 'receitas') {
            console.log(`- [${d.id}] ${d.data().name} | parent_id: ${d.data().parent_id} | level: ${d.data().level}`);
            count++;
        }
    });
    console.log(`Total 'receitas' no CategoryTree: ${count}`);

    console.log("\nAgora na tabela Category:");
    const snap2 = await getDocsFromServer(collection(db, 'Category'));
    let count2 = 0;
    snap2.forEach(d => {
        if (d.data().type === 'receitas') {
            console.log(`- [${d.id}] ${d.data().name}`);
            count2++;
        }
    });
    console.log(`Total 'receitas' no Category: ${count2}`);

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
