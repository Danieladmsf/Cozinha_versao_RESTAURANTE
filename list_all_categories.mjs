
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🔍 LISTANDO TODO O CONTEÚDO ATUAL DA TABELA 'CATEGORY' 🔍\n");

    const snap = await getDocsFromServer(collection(db, 'Category'));

    const byType = {};
    snap.docs.forEach(d => {
        const data = d.data();
        const type = data.type || 'S/ TIPO';
        if (!byType[type]) byType[type] = [];
        byType[type].push(data.name);
    });

    for (const type in byType) {
        console.log(`\n📌 TIPO: [${type.toUpperCase()}] (${byType[type].length} itens)`);
        byType[type].sort().forEach(name => {
            console.log(`  - ${name}`);
        });
    }

    console.log(`\nTotal Geral: ${snap.size} categorias.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
