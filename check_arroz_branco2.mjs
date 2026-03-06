import { db } from './lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Buscando Rotisseria Arroz Branco...");
    const q1 = query(collection(db, "WeeklyMenu"), where("name", ">=", "Rotisseria Arroz Branco"), where("name", "<=", "Rotisseria Arroz Branco\uf8ff"));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => console.log("WeeklyMenu", JSON.stringify(d.data(), null, 2)));

    const q2 = query(collection(db, "Recipe"), where("name", ">=", "Rotisseria Arroz Branco"), where("name", "<=", "Rotisseria Arroz Branco\uf8ff"));
    const snap2 = await getDocs(q2);
    snap2.forEach(d => console.log("Recipe", JSON.stringify(d.data(), null, 2)));

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
