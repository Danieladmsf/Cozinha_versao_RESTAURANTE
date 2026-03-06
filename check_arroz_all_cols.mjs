import { db } from './lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Buscando Rotisseria Arroz no BD...");

    for (const col of ["Recipe", "Product", "WeeklyMenu"]) {
        console.log(`\n--- Buscando em ${col} ---`);
        const q = query(collection(db, col), where("name", ">=", "Rotisseria Arroz Branco"), where("name", "<=", "Rotisseria Arroz Branco\uf8ff"));
        const snap = await getDocs(q);
        snap.forEach(d => {
            const data = d.data();
            console.log(`[${col}] ID: ${d.id}`);
            console.log(`  Name: ${data.name}`);
            console.log(`  Portion Weight Calculated: ${data.portion_weight_calculated}`);
            console.log(`  Preparations: ${data.preparations?.length || 0}`);
        });
    }

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
