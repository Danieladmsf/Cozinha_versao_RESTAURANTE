import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkArroz() {
    console.log("Baixando dicionário de Receitas do Banco...");
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipesArr = [];
    snap.forEach(d => recipesArr.push({ id: d.id, ...d.data() }));

    const matriz = recipesArr.find(r => r.name === 'Arroz Branco' && r.type === 'receitas');
    if (!matriz) {
        console.error("Matriz 'Arroz Branco' não encontrada!");
        return;
    }

    console.log(`\n============== MATRIZ ARROZ BRANCO ==============`);
    console.log(`ID: ${matriz.id}`);
    console.log(`Peso Bruto Total (total_weight): ${matriz.total_weight}`);
    console.log(`Rendimento Líquido (yield_weight): ${matriz.yield_weight}`);
    console.log(`Ingredientes (${matriz.ingredients?.length || 0}):`);
    if (matriz.ingredients) {
        matriz.ingredients.forEach(i => console.log(`  - ${i.name} (amount: ${i.amount}, weight/qtd: ${i.quantity})`));
    }


    console.log(`\n============== PRODUTOS AFETADOS ==============`);
    let count = 0;
    for (const prod of recipesArr) {
        if (prod.type !== 'produtos') continue;

        let hasArroz = false;
        if (prod.preparations) {
            prod.preparations.forEach(prep => {
                if (prep.origin_id === matriz.id) {
                    hasArroz = true;
                    if (count < 3) {
                        console.log(`\nProduto Encontrado: ${prod.name}`);
                        console.log(`Etapa Raiz: '${prep.title}'`);
                        console.log(` - Ingredientes na Etapa Raiz: ${prep.ingredients?.length || 0}`);
                        if (prep.ingredients) {
                            prep.ingredients.forEach(i => console.log(`    * ${i.name} (Qtd: ${i.quantity})`));
                        }
                    }
                }
            });
        }
        if (hasArroz) count++;
    }
    console.log(`\nTotal de Produtos com Arroz Branco: ${count}`);
}

checkArroz().then(() => process.exit(0)).catch(console.error);
