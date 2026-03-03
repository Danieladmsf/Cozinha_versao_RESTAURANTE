
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🔍 Diagnóstico Profundo do Formulário do Cardápio");

    const snap = await getDocsFromServer(collection(db, "WeeklyMenu"));

    let workingWeek = null;
    let ourWeek = null;

    snap.forEach(d => {
        const data = d.data();
        if (d.id === 'IC5JzmhvJhqLagtyTfIP') workingWeek = data; // Week W6 (old hash working one)
        if (d.id === '2026-W09') ourWeek = data;
    });

    console.log(`\n================= SEMANA ANTIGA (W6 - Que funcionava) =================`);
    if (workingWeek) {
        console.log(`Chaves raiz:`, Object.keys(workingWeek));
        console.log(`week_key type/val:`, typeof workingWeek.week_key, `'${workingWeek.week_key}'`);
        console.log(`active type/val:`, typeof workingWeek.active, workingWeek.active);
        if (workingWeek.week_start) {
            const d = workingWeek.week_start.toDate ? workingWeek.week_start.toDate() : "Não é timestamp";
            console.log(`week_start:`, d);
        }
    }

    console.log(`\n================= NOSSA SEMANA (2026-W09) =================`);
    if (ourWeek) {
        console.log(`Chaves raiz:`, Object.keys(ourWeek));
        console.log(`week_key type/val:`, typeof ourWeek.week_key, `'${ourWeek.week_key}'`);
        console.log(`active type/val:`, typeof ourWeek.active, ourWeek.active);
        if (ourWeek.week_start) {
            const d = ourWeek.week_start.toDate ? ourWeek.week_start.toDate() : "Não é timestamp";
            console.log(`week_start:`, d);
        }
    }

    console.log("\nComparando as estruturas de days/menu_data:");
    if (workingWeek && ourWeek) {
        const oldGroups = workingWeek.menu_data ? Object.keys(workingWeek.menu_data) : [];
        const newGroups = ourWeek.menu_data ? Object.keys(ourWeek.menu_data) : [];
        console.log(`- Grupos antigos (W6):`, oldGroups);
        console.log(`- Novos Grupos (W09):`, newGroups);

        console.log(`\nVerificando conteúdo interno do primeiro grupo no NOVO:`);
        if (newGroups.length > 0) {
            const g = newGroups[0];
            console.log(`Dias do grupo ${g}:`, Object.keys(ourWeek.menu_data[g]));
            const d0 = Object.keys(ourWeek.menu_data[g])[0];
            if (d0) {
                console.log(`Categorias no dia ${d0}:`, Object.keys(ourWeek.menu_data[g][d0]));
                const cat0 = Object.keys(ourWeek.menu_data[g][d0])[0];
                if (cat0) {
                    console.log(`Item amostra na categoria ${cat0}:`, JSON.stringify(ourWeek.menu_data[g][d0][cat0][0]));
                }
            }
        }
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
