
import { db } from './lib/firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Corrigindo estrutura do Cardápio Injetado...");

    const weekId = "2026-W10";
    const menuRef = doc(db, "WeeklyMenu", weekId);

    const snap = await getDoc(menuRef);
    if (!snap.exists()) {
        console.log("❌ Documento 2026-W10 não encontrado no Firestore!");
        process.exit(1);
    }

    let data = snap.data();
    let oldMenuData = data.menu_data || {};

    let cleanMenuData = {};

    // Quais grupos são originais de comida e não sujeiras de state frontend?
    // "group-2R8RbsGcor7voWuG8ouI-1771271583966" e "group-x3lLCsradGvncKDNXgEF-1769948050195" são os validos.
    const validGroupPrefixes = ['group-'];

    Object.keys(oldMenuData).forEach(groupKey => {
        if (!validGroupPrefixes.some(prefix => groupKey.startsWith(prefix))) {
            console.log(`🧹 Removendo chave corrompida: ${groupKey}`);
            return;
        }

        cleanMenuData[groupKey] = {};
        const days = oldMenuData[groupKey];

        Object.keys(days).forEach(dayNum => {
            // dia deve ser numero de "0" a "6"
            if (!/^[0-6]$/.test(dayNum)) return;

            cleanMenuData[groupKey][dayNum] = {};
            const cats = days[dayNum];

            Object.keys(cats).forEach(catId => {
                const items = cats[catId];
                if (Array.isArray(items) && items.length > 0) {
                    cleanMenuData[groupKey][dayNum][catId] = items;
                }
            });

            // se o dia ficou vazio, limpa
            if (Object.keys(cleanMenuData[groupKey][dayNum]).length === 0) {
                delete cleanMenuData[groupKey][dayNum];
            }
        });
    });

    console.log(`\n✅ Nova estrutura formatada e purificada.`);

    // Fallback `days` object for legacy 1.0 architecture 
    // Usually it expects flat array per category across the selected group
    // To match what user sees in screenshot, let's grab the biggest group
    const groups = Object.keys(cleanMenuData);
    let biggestGroup = groups[0];
    let maxItems = 0;

    groups.forEach(g => {
        let count = 0;
        Object.keys(cleanMenuData[g]).forEach(d => {
            Object.keys(cleanMenuData[g][d]).forEach(c => {
                count += cleanMenuData[g][d][c].length;
            });
        });
        if (count > maxItems) {
            maxItems = count;
            biggestGroup = g;
        }
    });

    const finalFlatDays = biggestGroup ? cleanMenuData[biggestGroup] : {};

    await setDoc(menuRef, {
        id: weekId,
        week_key: weekId,
        menu_data: cleanMenuData,
        days: finalFlatDays,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        active: true,
        user_id: "system-recovery"
    });

    console.log(`\n🚀 Cardápio W10 sobrescrito com limpeza completa!`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
