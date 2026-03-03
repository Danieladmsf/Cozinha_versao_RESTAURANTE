import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function diagnose() {
    try {
        // 1. Dump weekly menu docs
        const weeklySnap = await getDocs(collection(db, 'WeeklyMenu'));
        console.log(`\n=== WEEKLY MENU: ${weeklySnap.size} documentos ===`);

        weeklySnap.forEach(d => {
            const data = d.data();
            console.log(`\nDoc ID: ${d.id}`);
            console.log(`  week_key: ${data.week_key || 'FALTANDO!'}`);
            console.log(`  user_id: ${data.user_id || 'FALTANDO!'}`);

            if (data.menu_data) {
                const groups = Object.keys(data.menu_data);
                console.log(`  Grupos de aba: ${groups.length}`);
                groups.forEach(g => {
                    const days = Object.keys(data.menu_data[g]);
                    console.log(`    Grupo ${g.slice(0, 20)}... -> ${days.length} dias`);
                    days.forEach(dayIdx => {
                        const cats = Object.keys(data.menu_data[g][dayIdx]);
                        let totalItems = 0;
                        cats.forEach(c => {
                            const arr = data.menu_data[g][dayIdx][c];
                            if (Array.isArray(arr)) totalItems += arr.length;
                        });
                        console.log(`      Dia ${dayIdx}: ${cats.length} categorias, ${totalItems} itens`);
                    });
                });
            } else {
                console.log(`  menu_data: VAZIO!`);
            }
        });

        // 2. Check categories
        const catSnap = await getDocs(collection(db, 'CategoryTree'));
        console.log(`\n=== CATEGORIAS: ${catSnap.size} ===`);

        // 3. Products
        const prodSnap = await getDocs(collection(db, 'Product'));
        console.log(`=== PRODUTOS: ${prodSnap.size} ===`);

        // 4. Recipes
        const recSnap = await getDocs(collection(db, 'Recipe'));
        console.log(`=== RECEITAS: ${recSnap.size} ===`);

        // 5. MenuConfig
        const confSnap = await getDocs(collection(db, 'MenuConfig'));
        console.log(`=== MENU CONFIG: ${confSnap.size} ===`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
diagnose();
