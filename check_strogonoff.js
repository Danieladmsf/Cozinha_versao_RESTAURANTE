import { db } from './lib/firebase.js';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

async function testID() {
    // ID extraído da print do log: "xx1SHFtzwZEGPi5G2Fy3"
    // Mas o log diz que foi "#007874Refeicao: Arroz, Farofa, Batata Assada, Strogonoff de Carne"
    // Como a URL convergiu pra isso? 
    const testId = "007874";

    console.log(`Buscando Produto...`);

    // Let's do a wild search for this "#007874..." String or just list products
    const snap = await getDocs(collection(db, 'Recipe'));
    let found = false;
    snap.forEach(d => {
        const data = d.data();
        if (data.name && data.name.includes("Strogonoff de Carne")) {
            console.log(`\nACHEI RECIPE: ${data.name}`);
            console.log(`  ID: ${d.id}`);
            console.log(`  Type: ${data.type}`);
            console.log(`  Code: ${data.code}`);
            found = true;
        }
    });

    const snapProd = await getDocs(collection(db, 'Product'));
    snapProd.forEach(d => {
        const data = d.data();
        if (data.name && data.name.includes("Strogonoff de Carne")) {
            console.log(`\nACHEI PRODUCT: ${data.name}`);
            console.log(`  ID: ${d.id}`);
            console.log(`  Code: ${data.code}`);
            found = true;
        }
    });

}

testID().then(() => process.exit(0)).catch(console.error);
