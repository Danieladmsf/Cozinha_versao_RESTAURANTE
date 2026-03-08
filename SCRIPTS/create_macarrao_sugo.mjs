import { db } from '../lib/firebase.js';
import { collection, getDocsFromServer, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const gid = () => String(Date.now() + Math.random()).replace('.', '');

class RecipeBuilder {
    constructor() {
        this.ingredientsMap = {};
    }

    async loadDB() {
        const ingSnap = await getDocsFromServer(collection(db, "Ingredient"));
        ingSnap.forEach(d => {
            this.ingredientsMap[d.data().name.trim()] = {
                id: d.id,
                price: d.data().current_price || 0,
                unit: d.data().unit
            };
        });
    }

    createIngredient(name, qty, weightRaw, weightClean, weightCooked, lossClean = '0', lossCook = '0') {
        const item = this.ingredientsMap[name];
        if (!item) console.warn(`[WARN] Ingrediente ausente: "${name}"`);

        return {
            id: gid(),
            ingredient_id: item ? item.id : null,
            name: name,
            unit: item ? item.unit : 'kg',
            quantity: qty,
            current_price: item ? item.price : 0,
            weight_raw: String(weightRaw),
            weight_clean: String(weightClean),
            weight_cooked: String(weightCooked),
            weight_frozen: 0,
            weight_thawed: 0,
            weight_pre_cooking: String(weightClean),
            weight_portioned: 0,
            yield_weight: 0,
            loss_clean: String(lossClean),
            loss_cook: String(lossCook),
            cost_raw: 0,
            cost_clean: 0,
            cost_cooked: 0,
            locked: false
        };
    }
}

async function run() {
    const builder = new RecipeBuilder();
    await builder.loadDB();

    console.log("🍝 Criando Molho ao Sugo...");

    // 1. Criar Molho ao Sugo (Receita Matriz)
    const idMolho = 'sugo_' + gid();

    // Stage Molho
    const molhoPreps = [{
        id: gid(),
        title: "1ª Etapa: Preparo do Molho ao Sugo",
        processes: ['cooking'],
        ingredients: [
            builder.createIngredient('Tomate', 5.0, '5.000', '4.750', '3.325', '5', '30'),
            builder.createIngredient('Cebola', 1.0, '1.000', '0.900', '0.630', '10', '30'),
            builder.createIngredient('Alho Fresco', 0.1, '0.100', '0.085', '0.068', '15', '20'),
            builder.createIngredient('Azeite de Oliva', 0.1, '0.100', '0.100', '0.100', '0', '0'),
            builder.createIngredient('Sal Refinado', 0.03, '0.030', '0.030', '0.030', '0', '0'),
            builder.createIngredient('Extrato de Tomate', 0.15, '0.150', '0.150', '0.150', '0', '0'),
            builder.createIngredient('Manjericão Fresco', 0.05, '0.050', '0.050', '0.050', '0', '0')
        ],
        notes: [
            {
                title: "Modo de Preparo",
                content: "1. Assar tomate, cebola e alho no forno a 200°C até caramelizar.\n2. Bater tudo no liquidificador com azeite e extrato de tomate.\n3. Apurar na panela até encorpar.\n4. Desligar o fogo e adicionar folhas de manjericão fresco e acertar o sal."
            }
        ]
    }];

    const recipeMolho = {
        name: "Molho ao Sugo",
        type: "receitas",
        category: "molhos",
        category_name: "Molhos",
        preparations: molhoPreps,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'Recipe', idMolho), recipeMolho);
    console.log(`✅ Molho ao Sugo criado (${idMolho}). Rendimento total: ~4.35kg.`);

    // ============================================
    // 2. Criar Macarrão ao Sugo (Que importa o molho)
    // ============================================

    console.log("🍝 Criando Macarrão ao Sugo...");
    const idMacarrao = 'macarrao_sugo_' + gid();

    // Etapa 1: Cocção do Espaguete
    const etapaMassa = {
        id: gid(),
        title: "1ª Etapa: Cocção do Espaguete",
        processes: ['cooking'],
        ingredients: [
            builder.createIngredient('Espaguete', 2.0, '2.000', '2.000', '4.000', '0', '-100'), // -100% loss = 200% yield
            builder.createIngredient('Água', 6.0, '6.000', '6.000', '0', '0', '100'),
            builder.createIngredient('Sal Refinado', 0.06, '0.060', '0.060', '0.060', '0', '0'),
            builder.createIngredient('Azeite de Oliva', 0.018, '0.018', '0.018', '0.018', '0', '0')
        ],
        notes: [{ title: "Modo de Preparo", content: "Cozinhar o espaguete em água fervente com sal e um fio de azeite até ficar al dente. Escorrer bem." }]
    };

    // Etapa 2: Importação do Molho ao Sugo
    // Faremos para 3 kg de molho, clonando a matriz (bloqueando ingredientes)
    let yieldTotalMolho = 0;
    const molhoIngs = molhoPreps[0].ingredients.map(ing => {
        const cooked = parseFloat(ing.weight_cooked) || 0;
        yieldTotalMolho += cooked;
        return { ...ing, id: gid(), locked: true }; // Todos locked pois vêm da matriz
    });

    const targetMolhoWeight = 3.0; // 3kg para essa receita
    const factor = targetMolhoWeight / yieldTotalMolho;

    const scaledMolhoIngs = molhoIngs.map(ing => {
        const scale = (val) => {
            let num = parseFloat(val);
            if (num > 0) return String(parseFloat((num * factor).toFixed(5)));
            return String(val || 0);
        };
        return {
            ...ing,
            quantity: scale(ing.quantity),
            weight_raw: scale(ing.weight_raw),
            weight_clean: scale(ing.weight_clean),
            weight_pre_cooking: scale(ing.weight_pre_cooking),
            weight_cooked: scale(ing.weight_cooked)
        };
    });

    const etapaSugo = {
        id: gid(),
        title: "2ª Etapa: Molho ao Sugo",
        processes: ['cooking'],
        origin_id: idMolho, // ⬅️ Aqui mora o segredo da importação!
        instructions: "Importado da receita base: Molho ao Sugo",
        ingredients: scaledMolhoIngs,
        notes: [{ title: "Montagem", content: "Incorporar o molho quente ao espaguete e servir imediatamente." }]
    };

    const recipeMacarrao = {
        name: "Macarrão ao Sugo com Espaguete",
        type: "receitas",
        category: "acompanhamento",
        category_name: "Acompanhamento",
        preparations: [etapaMassa, etapaSugo],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'Recipe', idMacarrao), recipeMacarrao);
    console.log(`✅ Macarrão ao Sugo criado (${idMacarrao}).`);

    setTimeout(() => process.exit(0), 500);
}

run().catch(console.error);
