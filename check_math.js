import { db } from './lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function getIng() {
    const snap = await getDocs(query(collection(db, 'Recipe'), where('name', '==', 'Refeicao: Arroz, Farofa, Batata Assada, Strogonoff de Carne')));
    snap.forEach(d => {
        const prep = d.data().preparations[0];
        const ing = prep.ingredients.find(i => i.name.includes('Arroz Tipo 1'));
        console.log(`\nStrogonoff: `);
        console.log(`Ing: `, ing);
    });

    const snap2 = await getDocs(query(collection(db, 'Recipe'), where('name', '==', 'Rotisseria Arroz Branco Bendito Kg')));
    snap2.forEach(d => {
        const prep = d.data().preparations[0];
        const ing = prep.ingredients.find(i => i.name.includes('Arroz Tipo 1'));
        console.log(`\nRotisseria: `);
        console.log(`Ing: `, ing);
    });
}
getIng().then(() => process.exit(0)).catch(console.error);
