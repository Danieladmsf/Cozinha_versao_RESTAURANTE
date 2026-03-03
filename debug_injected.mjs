
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, query, orderBy, limit } from 'firebase/firestore';

async function main() {
    console.log("🔍 Inspecionando Últimas Semanas do Firestore...");
    const snap = await getDocsFromServer(query(collection(db, "WeeklyMenu"), orderBy("week_start", "desc"), limit(4)));

    snap.forEach(d => {
        const data = d.data();
        console.log(`\n===========================================`);
        console.log(`ID: ${d.id} | WEEK_KEY: ${data.week_key}`);
        console.log(`DAYS KEYS: ${Object.keys(data.days || {})}`);
        console.log(`MENU_DATA KEYS: ${Object.keys(data.menu_data || {})}`);

        // Verifica que categorias tem em MENU_DATA
        if (data.menu_data) {
            Object.keys(data.menu_data).forEach(grupo => {
                console.log(`  Grupo ${grupo}:`);
                const dias = data.menu_data[grupo];
                Object.keys(dias).forEach(dia => {
                    const cats = dias[dia];
                    let totalItems = 0;
                    Object.keys(cats).forEach(c => totalItems += cats[c].length);
                    console.log(`    Dia ${dia} -> ${totalItems} itens`);
                });
            });
        }
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
