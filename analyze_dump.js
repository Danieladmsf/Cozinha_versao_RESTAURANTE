
import fs from 'fs';

async function analyze() {
    const data = JSON.parse(fs.readFileSync('menus_dump.json', 'utf8'));
    const week9 = data.find(d => d.week_key === '2026-W9');

    if (!week9) return;

    console.log(`Encontrado cardápio: ${week9.id} - Week: ${week9.week_key}`);

    // Dump completo da estrutura
    console.log(JSON.stringify(week9.menu_data, null, 2));
}
analyze();
