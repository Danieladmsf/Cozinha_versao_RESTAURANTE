
import fs from 'fs';

function main() {
    console.log("🔍 Extraindo menus com a estrutura correta...");

    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    let idToNameMap = {};
    if (fs.existsSync('diff8.txt')) {
        const diffStr = fs.readFileSync('diff8.txt', 'utf8');
        const lines = diffStr.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('id:')) {
                const idMatch = lines[i].match(/id:\s*['"]([^'"]+)['"]/);
                if (idMatch && idMatch[1]) {
                    const id = idMatch[1];
                    let name = "Desconhecido";
                    for (let j = Math.max(0, i - 15); j < Math.min(lines.length, i + 15); j++) {
                        if (lines[j].includes('name:')) {
                            const nameMatch = lines[j].match(/name:\s*['"]([^'"]+)['"]/);
                            if (nameMatch && nameMatch[1]) {
                                name = nameMatch[1];
                                break;
                            }
                        } else if (lines[j].includes('"name":')) {
                            const nameMatch = lines[j].match(/"name":\s*['"]([^'"]+)['"]/);
                            if (nameMatch && nameMatch[1]) {
                                name = nameMatch[1];
                                break;
                            }
                        }
                    }
                    if (name !== 'Desconhecido') {
                        idToNameMap[id] = name;
                    }
                }
            }
        }
    }

    dumpData.forEach(w => {
        if (!w.menu_data) return;

        let hasItems = false;
        let weekLog = [];

        Object.keys(w.menu_data).forEach(groupId => {
            const groupDays = w.menu_data[groupId];
            Object.keys(groupDays).forEach(day => {
                const cats = groupDays[day];
                let dayLog = [];
                Object.keys(cats).forEach(catId => {
                    const items = cats[catId];
                    if (Array.isArray(items)) {
                        items.forEach(item => {
                            if (item && item.recipe_id) {
                                hasItems = true;
                                const rId = item.recipe_id;
                                let guessedName = idToNameMap[rId] || ("ID Antigo: " + rId);
                                dayLog.push(`    - ${guessedName}`);
                            }
                        });
                    }
                });
                if (dayLog.length > 0) {
                    weekLog.push(`  📅 DIA ${day}:\n` + dayLog.join('\n'));
                }
            });
        });

        if (hasItems) {
            console.log(`\n=============================\n🔥 SEMANA ENCONTRADA: ${w.week_key || 'Semana Desconhecida'} 🔥`);
            console.log(weekLog.join('\n'));
        }
    });
}
main();
