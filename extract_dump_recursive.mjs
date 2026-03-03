
import fs from 'fs';

function main() {
    console.log("🔍 Extraindo IDs com nome do Dump...");
    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    let idToNameMap = {};
    if (fs.existsSync('diff8.txt')) {
        const diffStr = fs.readFileSync('diff8.txt', 'utf8');
        const lines = diffStr.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('id:')) {
                const match = lines[i].match(/id:\s*['"]([^'"]+)['"]/);
                if (match) {
                    const id = match[1];
                    for (let j = Math.max(0, i - 20); j < Math.min(lines.length, i + 20); j++) {
                        if (lines[j].includes('name:')) {
                            const nm = lines[j].match(/name:\s*['"]([^'"]+)['"]/);
                            if (nm) idToNameMap[id] = nm[1];
                        }
                    }
                }
            }
        }
    }

    // Função recursiva para achar todos os {recipe_id}
    function findRecipesRecursively(obj, path, results) {
        if (!obj) return;
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => findRecipesRecursively(item, `${path}[${idx}]`, results));
        } else if (typeof obj === 'object') {
            if (obj.recipe_id) {
                results.push({ path, id: obj.recipe_id });
            }
            Object.keys(obj).forEach(k => {
                findRecipesRecursively(obj[k], `${path}.${k}`, results);
            });
        }
    }

    dumpData.forEach(w => {
        let results = [];
        findRecipesRecursively(w.menu_data, 'menu_data', results);
        findRecipesRecursively(w._paste_backup, '_paste_backup', results);

        if (results.length > 0) {
            console.log(`\n=============================\n📅 SEMANA: ${w.week_key || '?'}`);
            let dayMap = {};
            results.forEach(res => {
                const dayMatch = res.path.match(/\.([0-6])\./) || res.path.match(/\[([0-6])\]/);
                const dayStr = dayMatch ? `DIA ${dayMatch[1]}` : "DIA DESCONHECIDO";
                if (!dayMap[dayStr]) dayMap[dayStr] = new Set();
                const name = idToNameMap[res.id] || `ID Antigo: ${res.id}`;
                dayMap[dayStr].add(name);
            });
            Object.keys(dayMap).sort().forEach(d => {
                console.log(`  ${d}:`);
                Array.from(dayMap[d]).forEach(n => console.log(`      - ${n}`));
            });
        }
    });
}

main();
