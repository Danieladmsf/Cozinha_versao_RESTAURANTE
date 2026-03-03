
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, query, orderBy, limit } from 'firebase/firestore';

async function main() {
    console.log("🔍 Procurando os 5 Cardápios mais recentes...");
    const q = query(collection(db, "WeeklyMenu"), orderBy("week_start", "desc"), limit(5));
    const snap = await getDocsFromServer(q);

    // Ler os recipes_id que podem estar no cardápio
    let brokenRefs = new Set();
    let currentWeekId = null;

    // Load available recipes for mapping check
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    const validRecipes = new Set();
    recSnap.forEach(d => validRecipes.add(d.id));

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`\n--- Cardápio: ${data.week_key} (${data.id}) ---`);
        if (!currentWeekId) currentWeekId = data.id;

        if (data.days) {
            Object.keys(data.days).forEach(day => {
                const dayCats = data.days[day];
                if (dayCats) {
                    Object.keys(dayCats).forEach(cat => {
                        dayCats[cat].forEach(item => {
                            if (item && item.recipe_id && !validRecipes.has(item.recipe_id)) {
                                console.log(`  ❌ [${day}] ID quebrado: ${item.recipe_id} (cat: ${cat})`);
                                brokenRefs.add(item.recipe_id);
                            } else if (item && item.recipe_id) {
                                console.log(`  ✅ [${day}] ID OK: ${item.recipe_id} (cat: ${cat})`);
                            }
                        });
                    });
                }
            });
        }
    });

    console.log(`\n📉 Total de IDs fantasmas no agendamento: ${brokenRefs.size}`);

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
