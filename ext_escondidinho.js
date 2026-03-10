import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function ext() {
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipes = [];
    snap.forEach(d => recipes.push({ id: d.id, ...d.data() }));

    const matriz = recipes.find(r => r.name === 'Escondidinho de Carne Seca' && r.type === 'receitas');
    const targetRecipe = recipes.find(r => r.name.includes('Rotisseria Escondidinho de Carne Seca') && r.type === 'produtos');
    const b1 = recipes.find(r => r.name === 'Purê de Mandioca' || r.name === 'Purê de Mandioca (Tarde)');
    const b2 = recipes.find(r => r.name === 'Recheio e Montagem' || r.name === 'Recheio e Montagem (Escondidinho)');

    fs.writeFileSync('escondidinho_data.json', JSON.stringify({
        matrizId: matriz?.id,
        targetId: targetRecipe?.id,
        targetPreparations: targetRecipe?.preparations,
    }, null, 2));
    console.log('JSON salvos!');
}

ext().then(() => process.exit(0));
