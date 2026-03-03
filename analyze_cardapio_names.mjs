
import fs from 'fs';

async function analyze() {
    const data = JSON.parse(fs.readFileSync('menus_dump.json', 'utf8'));
    const week9 = data.find(d => d.week_key === '2026-W9');

    if (!week9) return;

    let foundItems = [];

    for (const [groupId, days] of Object.entries(week9.menu_data)) {
        if (Array.isArray(days)) {
            days.forEach((dayData, dayIndex) => {
                if (dayData && typeof dayData === 'object') {
                    for (const [categoryId, items] of Object.entries(dayData)) {
                        if (Array.isArray(items) && items.length > 0) {
                            items.forEach((it, idx) => {
                                if (it.recipe_id || it.product_id) {
                                    foundItems.push(it);
                                }
                            });
                        }
                    }
                }
            });
        }
    }

    console.log("Amostra de itens no Cardápio (semana 9):");
    console.log(JSON.stringify(foundItems.slice(0, 5), null, 2));
}
analyze();
