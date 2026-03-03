
import fs from 'fs';

async function main() {
    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    let foundSomething = false;
    dumpData.forEach(w => {
        if (w.days && Object.keys(w.days).length > 0) {
            console.log(`Semana ${w.week_key} tem dados!`);
            foundSomething = true;
        }
    });

    if (!foundSomething) console.log("Nenhuma semana tem 'days' preenchido.");
}
main();
