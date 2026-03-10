import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { DemandCalculator } from './lib/production-engine/DemandCalculator.js';
import * as fs from 'fs';

async function trace() {
    console.log("Baixando dic...");
    const snapR = await getDocs(collection(db, 'Recipe'));
    const recipes = [];
    snapR.forEach(d => recipes.push({ id: d.id, ...d.data(), entityType: 'recipe' }));

    const snapP = await getDocs(collection(db, 'Product'));
    snapP.forEach(d => recipes.push({ id: d.id, ...d.data(), entityType: 'product' }));

    const snapO = await getDocs(collection(db, 'Order'));
    const orders = [];
    snapO.forEach(d => orders.push({ id: d.id, ...d.data() }));

    const groupsByDay = {};
    orders.forEach(o => {
        if (!o.items) return;
        const key = `${o.week_key}_${o.day_of_week}`;
        if (!groupsByDay[key]) groupsByDay[key] = [];
        groupsByDay[key].push(o);
    });

    const categoryMap = new Map();

    for (const key of Object.keys(groupsByDay)) {
        const dayOrders = groupsByDay[key];

        const leaf = DemandCalculator.explodeOrders(dayOrders, recipes, categoryMap);

        let sumArroz = 0;
        let p = [];
        leaf.forEach(ing => {
            if (ing.ingredient.name?.includes('Arroz Tipo 1')) {
                sumArroz += ing.scaledQty;
                p.push(`  + ${ing.scaledQty.toFixed(4)} kg -> ${ing.topLevelOrderedQty}x da Receita: ${ing.contextStr} (Fator: ${ing.scaledQty / DemandCalculator.parseNumber(ing.ingredient.quantity)})`);
            }
        });

        if (sumArroz > 5.5 && sumArroz < 6.5) {
            let out = `\n================= BINGO! DIA DA ABERRAÇÃO: ${key} =================\nSOMA: ${sumArroz.toFixed(4)} kg\n`;
            p.forEach(x => out += x + '\n');
            fs.writeFileSync('trace_bingo.txt', out);
            console.log("Arquivo trace_bingo.txt gerado com sucesso!");
            break;
        } else if (sumArroz > 0) {
            console.log(`\n================= DIA NORMAL: ${key} =================`);
            console.log(`SOMA: ${sumArroz.toFixed(4)} kg`);
            p.forEach(x => console.log(x));
        }
    }
}

trace().then(() => process.exit(0)).catch(console.error);
