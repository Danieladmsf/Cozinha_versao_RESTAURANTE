
import fs from 'fs';

function main() {
    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    console.log("Dump is array?", Array.isArray(dumpData));
    if (Array.isArray(dumpData)) {
        dumpData.forEach((w, i) => {
            console.log(`[${i}] week_key: ${w.week_key}, has days: ${!!w.days}`);
            if (w.days) {
                console.log(`  Days keys: ${Object.keys(w.days)}`);
                Object.keys(w.days).forEach(day => {
                    const cats = w.days[day];
                    console.log(`    Day ${day} cats: ${Object.keys(cats)}`);
                    Object.keys(cats).forEach(cat => {
                        console.log(`      Cat ${cat} length: ${cats[cat].length}`);
                        if (cats[cat].length > 0) {
                            console.log(`        Example:`, cats[cat][0]);
                        }
                    });
                });
            }
        });
    }
}
main();
