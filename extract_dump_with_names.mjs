
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🔍 Extraindo IDs com nome do Dump + Firestore...");
    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    const prodSnap = await getDocsFromServer(collection(db, "Product"));

    const idToName = {};
    recSnap.forEach(d => idToName[d.id] = d.data().name);
    prodSnap.forEach(d => idToName[d.id] = d.data().name); // also check products just in case

    // fallback mapping if it was deleted
    const oldGhostIds = {
        'Jj87AaREF6dtHyM9VAYc': 'Rotisseria Feijao Bendito KG',
        'cebIcHnAeytdjhu2zMSe': 'Rotisseria Arroz Branco Bendito KG',
        'A2a59EsZCQZrvdfnHd1X': 'Rotisseria Arroz a Grega Bendito KG',
        'YkC8PIOVjb7qnlG4umuo': 'Rotisseria Macarrao Alho e Oleo Bendito KG',
        'EX8KN1gj8Tllwe5LIxcJ': 'Rotisseria Macarrao ao Sugo Bendito KG',
        'G1srvd4IuXjlVyjFxl0j': 'Rotisseria Couve Flor Empanada Bendito KG',
        'KeKBEaPa4DcUFYFDrLGv': 'Rotisseria Polenta ao Molho Carne Moida Bendito KG',
        '7KpmaqOh0chO1O6DNmmP': 'Rotisseria Batata Assada Bendito KG',
        'xNgjBuy4CeSVvtm8sW9U': 'Rotisseria Bife a Role Bendito KG',
        'qC5PydN8xlngSNqJTIhP': 'Rotisseria Strogonoff de Carne Bendito KG',
        'XM4Pm2eAhNNbBcbkkVJt': 'Rotisseria Lasanha a Bolonhesa Bendito  KG',
        'xCdZqqhgInSq6gGZ5xFl': 'Rotisseria Frango Xadrez Bendito KG',
        'P3McQwWqNtiDSF6qT9Rh': 'Rotisseria Medalhao Frango Bendito KG',
        'Vg2n7r31RmQYvjeStgg3': 'Rotisseria Pure de Batata Bendito KG',
        'Aoad5AIHaLVC40LeJFd9': 'Rotisseria Creme de Milho Bendito KG',
        'WyoM854HivDYEx3TMdtE': 'Rotisseria Legumes Bendito KG',
        '51SWmvzycOLNTeDHyyRZ': 'Rotisseria Abobrinha Gratinada Bendito Kg',
        '6KkPyob9GF7C4zOZd3aq': 'Rotisseria Isca de Frango a Milanesa Bendito KG',
        'mMgLYJ43UCi3k8YBERPx': 'Rotisseria File Sobrecoxa Assada Bendito kg'
    };

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
            console.log(`\n===========================================\n📅 SEMANA: ${w.week_key || '?'}`);
            let dayMap = {};
            results.forEach(res => {
                const dayMatch = res.path.match(/\.([0-6])\./) || res.path.match(/\[([0-6])\]/);
                const dayNum = dayMatch ? dayMatch[1] : "?";
                const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
                const dayStr = dayNum !== "?" ? dayNames[parseInt(dayNum)] : "Desconhecido";

                if (!dayMap[dayStr]) dayMap[dayStr] = new Set();
                const name = idToName[res.id] || oldGhostIds[res.id] || `??? (ID Deletado: ${res.id})`;
                dayMap[dayStr].add(name);
            });
            Object.keys(dayMap).sort().forEach(d => {
                console.log(`  ${d}:`);
                Array.from(dayMap[d]).forEach(n => console.log(`      - ${n}`));
            });
        }
    });
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
