
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🔍 Verificando documentos na coleção WeeklyMenu...");

    const snap = await getDocsFromServer(collection(db, "WeeklyMenu"));

    console.log("\n==================================");
    snap.forEach(d => {
        const data = d.data();
        let itemsCount = 0;

        if (data.menu_data) {
            Object.keys(data.menu_data).forEach(g => {
                Object.keys(data.menu_data[g]).forEach(day => {
                    Object.keys(data.menu_data[g][day]).forEach(cat => {
                        itemsCount += data.menu_data[g][day][cat].length || 0;
                    });
                });
            });
        }

        console.log(`Document ID: ${d.id}`);
        console.log(`- week_key: ${data.week_key}`);
        console.log(`- active: ${data.active}`);
        console.log(`- user_id: ${data.user_id}`);
        console.log(`- Quantidade de itens salvos: ${itemsCount}`);

        let shouldDelete = false;
        if (d.id !== data.week_key && (data.week_key === '2026-W09' || data.week_key === '2026-W10' || data.week_key === '2026-W9')) {
            shouldDelete = true;
        }

        if (shouldDelete) {
            console.log(`🧨 STATUS: LIXEIRA! (Duplicado ou formato antigo que atrapalha)`);
        } else if (d.id === '2026-W09' || d.id === '2026-W10') {
            console.log(`✅ STATUS: NOVO OFICIAL INJETADO! (Manter)`);
        } else {
            console.log(`ℹ️ STATUS: Outra semana passada (Pode manter)`);
        }

        console.log("----------------------------------");
    });

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
