import { db } from './lib/firebase.js';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

async function testUpdate() {
    try {
        const snap = await getDocs(collection(db, 'Recipe'));
        const recipes = [];
        snap.forEach(d => recipes.push({ id: d.id, ...d.data() }));

        const targetRecipe = recipes.find(r => r.id === '0X9oEnDiDBXtUxlVKx9r');
        if (!targetRecipe) {
            console.log('Not found in Recipe collection either.');
            return;
        }

        console.log('Target Recipe Found:', targetRecipe.name);

        let updatedPreparations = JSON.parse(JSON.stringify(targetRecipe.preparations));
        const oldName = updatedPreparations[0].ingredients[0].name;
        updatedPreparations[0].ingredients[0].name = oldName + ' (Teste)';

        console.log('UPDATING DB. Original first ingredient:', oldName);
        console.log('New ingredient will be:', updatedPreparations[0].ingredients[0].name);

        const docRef = doc(db, 'Recipe', targetRecipe.id);
        await updateDoc(docRef, {
            preparations: updatedPreparations,
            updatedAt: new Date()
        });

        console.log('UPDATE DONE. Checking changes directly:');

        // Now read back directly
        const snap2 = await getDoc(docRef);
        let target2 = snap2.data();

        console.log('Read back:', target2.preparations[0].ingredients[0].name);

        // Revert 
        updatedPreparations[0].ingredients[0].name = oldName;
        await updateDoc(docRef, { preparations: updatedPreparations });
        console.log('Reverted.');

    } catch (e) {
        console.error('ERROR FIREBASE SCRIPT:', e);
    }
}

testUpdate().then(() => process.exit(0));
