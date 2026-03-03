
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Checando TODAS as receitas criadas hoje...");
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));

    // Filtro heurístico: todas as criadas recentemente (a maioria das marmitas são de MARMITA 3 DIVISORIAS)
    let marmitas = [];
    recSnap.forEach(r => {
        const data = r.data();
        if (data.category === 'MARMITA 3 DIVISORIAS (ALMOÇO)' || data.category === 'MONO ARROZ (ALMOÇO)' || data.category === 'MACARRÃO (ALMOÇO)') {
            marmitas.push({ id: r.id, name: data.name, type: data.type, active: data.active, _createdAt: data.createdAt?.toDate?.() });
        }
    });

    console.log(`Encontradas ${marmitas.length} receitas nas categorias de Almoço.`);

    // Sort by name
    marmitas.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        console.log(`- ${p.name} | type: ${p.type} | active: ${p.active} | created: ${p._createdAt}`);
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
