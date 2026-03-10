import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkDuplicates() {
    console.log("Buscando Strogonoffs no Banco...");

    const snap = await getDocs(collection(db, 'Recipe'));
    const strogonoffs = [];

    snap.forEach(d => {
        const data = d.data();
        if (data.name && data.name.toLowerCase().includes("strogonoff de carne") && data.type === 'produtos') {
            strogonoffs.push({
                id: d.id,
                name: data.name,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 'N/A',
                preparationsCount: data.preparations ? data.preparations.length : 0,
                type: data.type
            });
        }
    });

    console.log(`\nEncontrados ${strogonoffs.length} produtos correspondentes:`);
    strogonoffs.forEach((s, idx) => {
        console.log(`\n[${idx + 1}] Nome: ${s.name}`);
        console.log(`    ID: ${s.id}`);
        console.log(`    Criado em: ${s.createdAt}`);
        console.log(`    Preparações/Etapas: ${s.preparationsCount}`);
    });
}

checkDuplicates().then(() => process.exit(0)).catch(console.error);
