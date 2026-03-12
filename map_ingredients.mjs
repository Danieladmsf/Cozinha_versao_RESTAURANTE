import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function listIngredients() {
    console.log("🔍 Mapeando ingredientes para o Bobó...");
    const snap = await getDocs(collection(db, 'Ingredient'));
    const needed = [
        'mandioca', 'leite de coco', 'azeite de dende', 'dendê', 
        'cenoura', 'chuchu', 'pimentão', 'pimentao', 'tomate', 
        'cebola', 'alho', 'azeite de oliva', 'azeite extra virgem', 'sal refinado'
    ];
    
    const mapping = {};
    snap.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toLowerCase();
        needed.forEach(n => {
            if (name.includes(n)) {
                if (!mapping[n]) mapping[n] = [];
                mapping[n].push({ id: doc.id, name: data.name, price: data.current_price, unit: data.unit });
            }
        });
    });

    console.log(JSON.stringify(mapping, null, 2));
    process.exit(0);
}

listIngredients().catch(err => {
    console.error(err);
    process.exit(1);
});
