import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function mapFishIngredients() {
    console.log("🔍 Mapeando ingredientes para o Peixe Empanado...");
    const snap = await getDocs(collection(db, 'Ingredient'));
    const needed = [
        'panga', 'pagasais', 'peixe', 'filé de peixe',
        'sal refinado', 'alho', 'limão', 'limao',
        'farinha de trigo', 'farinha de rosca', 'farinha'
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

mapFishIngredients().catch(err => {
    console.error(err);
    process.exit(1);
});
