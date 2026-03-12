import { db } from '../lib/firebase.js';
import { collection, query, getDocs } from 'firebase/firestore';

async function findRecipe() {
    let found = false;
    const collections = ['Recipes', 'Products', 'Ingredients', 'WeeklyMenu', 'Orders'];
    for (const colName of collections) {
        console.log(`Buscando em ${colName}...`);
        const q = query(collection(db, colName));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const name = (data.name || '').toLowerCase();
            if (name.includes('bobo') || name.includes('legumes')) {
                console.log(`- [${colName}] ${doc.id}: ${data.name}`);
                found = true;
            }
        });
    }

    if (!found) {
        console.log('Nenhuma receita encontrada com "Bobó" ou "Legumes".');
    }
    process.exit(0);
}

findRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
