import { db } from '../lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function main() {
    console.log("🛠️ VERIFICANDO PATÊ DE ALHO NO BANCO 🛠️");

    const recipeSnap = await getDocs(query(collection(db, 'Recipe'), where("name", "==", "Patê de Alho")));

    if (recipeSnap.empty) {
        console.log("Não achei a receita 'Patê de Alho'.");
    } else {
        recipeSnap.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`Name: ${data.name}`);
            console.log(`Category (Text): ${data.category}`);
            console.log(`Category ID: ${data.category_id}`);
            console.log(`Type: ${data.type}`);
        });
    }

    const prodSnap = await getDocs(query(collection(db, 'Product'), where("name", "==", "008551 - ROTISSERIA PATE ALHO BENDITO KG")));
    if (prodSnap.empty) {
        console.log("\nNão achei o produto '008551 - ROTISSERIA PATE ALHO BENDITO KG'.");
    } else {
        prodSnap.forEach(doc => {
            const data = doc.data();
            console.log(`\nID: ${doc.id}`);
            console.log(`Product Name: ${data.name}`);
            console.log(`Category (Text): ${data.category}`);
            console.log(`Category ID: ${data.category_id}`);
            console.log(`Type: ${data.type}`);
        });
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
