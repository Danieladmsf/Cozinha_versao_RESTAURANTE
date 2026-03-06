import { db } from './lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Buscando Rotisseria Cabotia no BD exato...");

    // 1. Fetch from Recipe by exact name (from screenshot)
    const exactName = "Rotisseria Purê de Cabotia Bendito Kg";
    const recipeSnap = await getDocs(query(collection(db, "Recipe"), where("name", "==", exactName)));

    console.log(`Found ${recipeSnap.size} matches in Recipe with exact name "${exactName}"`);
    recipeSnap.forEach(d => {
        const data = d.data();
        console.log(`\n[Recipe] ID: ${d.id}`);
        console.log(JSON.stringify(data, null, 2));
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
