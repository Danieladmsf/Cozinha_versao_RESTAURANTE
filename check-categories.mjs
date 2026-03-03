
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Checando categorias das Refeições...");

    // As "Refeições" foram criadas com type='produtos' (ou talvez format='assembly'?)
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));

    let refeicoes = [];
    recSnap.forEach(r => {
        const data = r.data();
        if (data.name && data.name.includes("Refeicao:")) {
            refeicoes.push({ id: r.id, name: data.name, category: data.category, category_id: data.category_id });
        }
    });

    console.log(`Encontradas ${refeicoes.length} Refeições com 'Refeicao:' no nome`);
    refeicoes.slice(0, 5).forEach(r => {
        console.log(`- ${r.name}`);
        console.log(`  > category: ${r.category} | category_id: ${r.category_id}`);
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
