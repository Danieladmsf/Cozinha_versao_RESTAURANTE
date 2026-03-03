
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Contando total de Refeições/Produtos...");
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));

    let prodCount = 0;
    let prodList = [];
    recSnap.forEach(r => {
        const data = r.data();
        if (data.type === 'produtos') {
            prodCount++;
            prodList.push({ name: data.name, category: data.category });
        }
    });

    console.log(`Encontradas ${prodCount} receitas do tipo 'produtos' (Marmitas/Refeições)`);
    prodList.slice(0, 15).forEach(p => console.log(`- ${p.name} (${p.category})`));

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
