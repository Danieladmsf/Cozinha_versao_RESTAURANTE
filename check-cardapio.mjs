
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Verificando IDs perdidos no Cardápio Semanal...");

    // Pegar Cardápios Semanais
    const snap = await getDocsFromServer(collection(db, "WeeklyMenu"));

    // Pegar Receitas Existentes
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    const recipeIds = new Set();
    recSnap.forEach(r => recipeIds.add(r.id));

    let totalItems = 0;
    let missingItems = 0;

    snap.forEach(d => {
        const data = d.data();
        const menuData = data.menu_data || {};

        // Formato sem grupos (Keys "0", "1", "2"...)
        for (const [dayKey, categoriesObj] of Object.entries(menuData)) {
            // Check se a key é um número (índice do dia)
            if (!isNaN(dayKey) && typeof categoriesObj === 'object' && !Array.isArray(categoriesObj)) {
                for (const [categoryId, items] of Object.entries(categoriesObj)) {
                    if (Array.isArray(items)) {
                        items.forEach(item => {
                            totalItems++;
                            let idToCheck = item.recipe_id || item.product_id || item.id;

                            if (idToCheck && !recipeIds.has(idToCheck)) {
                                missingItems++;
                                console.log(`  ❌ Cardápio ${d.id} | Dia ${dayKey}, Cat ${categoryId}: ID ${idToCheck} DELETADO/NÃO EXISTE`);
                            }
                        });
                    }
                }
            }
        }
    });

    console.log(`\nResumo: Total itens agendados: ${totalItems} | Itens que sumiram (Deleted ID): ${missingItems}`);
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
