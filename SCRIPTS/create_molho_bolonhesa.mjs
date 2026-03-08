import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ============================================================
// MOLHO BOLONHESA — RECEITA BASE (type: 'receitas')
// Categoria: Bovino
// 2 Etapas:
//   1ª Etapa: Carne (Coxão Duro)
//   2ª Etapa: Molho de Tomate (tomate, cebola, alho, cenoura
//             assados no forno, depois batidos, apurados com sal,
//             e extrato de tomate para tingir o soro)
// ============================================================

const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function loadIngredientsMap() {
    const snap = await getDocs(collection(db, 'Ingredient'));
    const map = {};
    snap.forEach(d => {
        map[d.data().name.trim()] = {
            id: d.id,
            price: d.data().current_price || 0,
            unit: d.data().unit || 'kg'
        };
    });
    return map;
}

function makeIng(ingredientsMap, name, unit, qty, rawKg, cleanKg, cookedKg, lossClean, lossCook) {
    const item = ingredientsMap[name];
    if (!item) {
        console.warn(`⚠️  Ingrediente NÃO encontrado: "${name}"`);
    }
    return {
        id: generateId(),
        ingredient_id: item ? item.id : null,
        name,
        unit,
        quantity: qty,
        current_price: item ? item.price : 0,
        weight_raw: String(rawKg),
        weight_clean: String(cleanKg),
        weight_cooked: String(cookedKg),
        weight_frozen: 0,
        weight_thawed: 0,
        weight_pre_cooking: String(cleanKg),
        weight_portioned: 0,
        yield_weight: 0,
        cost_raw: 0,
        cost_clean: 0,
        cost_cooked: 0,
        locked: false
    };
}

async function createMolhoBolonhesa() {
    console.log("🍝 Criando Receita: Molho Bolonhesa...\n");

    const ingredientsMap = await loadIngredientsMap();
    console.log(`✅ ${Object.keys(ingredientsMap).length} ingredientes carregados do banco.\n`);

    // Verificar todos os ingredientes necessários
    const needed = ['Coxão Duro', 'Tomate', 'Cebola', 'Alho Fresco', 'Cenoura', 'Sal Refinado', 'Extrato de Tomate'];
    let allFound = true;
    needed.forEach(n => {
        if (!ingredientsMap[n]) {
            console.error(`❌ Ingrediente não encontrado: "${n}"`);
            allFound = false;
        } else {
            console.log(`   ✅ ${n} (ID: ${ingredientsMap[n].id})`);
        }
    });
    if (!allFound) {
        console.error("\n❌ Alguns ingredientes não foram encontrados. Abortando.");
        process.exit(1);
    }

    // ============================================================
    // IDs das etapas
    // ============================================================
    const idEtapa1 = generateId();
    const idEtapa2 = generateId();

    // ============================================================
    // 1ª ETAPA: Carne — Coxão Duro
    //
    // Coxão Duro: peça magra, precisa de cozimento lento.
    // Perda de limpeza ~5% (peça limpa), perda cocção ~35% (cozimento longo)
    // Base: 3 kg de coxão duro
    // ============================================================
    const etapa1 = {
        id: idEtapa1,
        title: "1ª Etapa: Carne (Coxão Duro)",
        processes: ['cooking'],
        ingredients: [
            makeIng(ingredientsMap, 'Coxão Duro', 'kg', 3.0,
                '3.000',   // bruto
                '2.850',   // limpo (5% perda limpeza)
                '1.853',   // cozido (35% perda cocção, cozimento lento)
                '5', '35')
        ],
        notes: [
            {
                title: "Modo de Preparo",
                content: "1. Receber a peça de coxão duro e verificar qualidade (cor, odor, textura).\n2. Limpar retirando nervos, gordura e aponevroses.\n3. Cortar em cubos médios (~3x3 cm) ou deixar em peça inteira para desfiamento posterior.\n4. Cozinhar em panela de pressão com água até cobrir, por aproximadamente 40-50 minutos, até a carne estar bem macia e se desfazendo.\n5. Retirar a carne e desfiar grosseiramente com dois garfos.\n6. Reservar a carne desfiada para incorporar ao molho na 2ª etapa.\n7. Descartar o caldo de cozimento ou reservar para outro uso."
            },
            {
                title: "Pontos Críticos de Controle (PCC)",
                content: "• Temperatura da carne ao receber: máximo 7°C.\n• Higienizar mãos, tábuas e facas antes do corte.\n• Usar tábua vermelha exclusiva para carnes.\n• Cozinhar até atingir textura de desfiar facilmente.\n• Temperatura interna mínima: 74°C."
            }
        ]
    };

    // ============================================================
    // 2ª ETAPA: Molho de Tomate
    //
    // Tomate, cebola, alho e cenoura assados no forno.
    // Depois batidos no liquidificador, apurados com sal.
    // Extrato de tomate industrializado adicionado para 
    // tingir (colorir) o soro do molho apenas.
    //
    // Perdas estimadas:
    //   Tomate: 5% limpeza, 30% cocção (assamento + apuramento)
    //   Cebola: 10% limpeza (casca), 30% cocção
    //   Alho: 15% limpeza (casca), 20% cocção
    //   Cenoura: 15% limpeza (casca/pontas), 25% cocção
    //   Sal: 0/0
    //   Extrato: 0/0 (adicionado no final)
    // ============================================================
    const etapa2 = {
        id: idEtapa2,
        title: "2ª Etapa: Molho de Tomate",
        processes: ['cooking'],
        ingredients: [
            makeIng(ingredientsMap, 'Tomate', 'kg', 5.0,
                '5.000',   // bruto
                '4.750',   // limpo (5% perda)
                '3.325',   // cozido (30% perda assamento/apuramento)
                '5', '30'),

            makeIng(ingredientsMap, 'Cebola', 'kg', 1.0,
                '1.000',   // bruto
                '0.900',   // limpo (10% casca)
                '0.630',   // cozido (30% assamento)
                '10', '30'),

            makeIng(ingredientsMap, 'Alho Fresco', 'kg', 0.100,
                '0.100',   // bruto
                '0.085',   // limpo (15% casca)
                '0.068',   // cozido (20% assamento)
                '15', '20'),

            makeIng(ingredientsMap, 'Cenoura', 'kg', 0.500,
                '0.500',   // bruto
                '0.425',   // limpo (15% casca/pontas)
                '0.319',   // cozido (25% assamento)
                '15', '25'),

            makeIng(ingredientsMap, 'Sal Refinado', 'kg', 0.030,
                '0.030',
                '0.030',
                '0.030',
                '0', '0'),

            makeIng(ingredientsMap, 'Extrato de Tomate', 'kg', 0.150,
                '0.150',
                '0.150',
                '0.150',
                '0', '0')
        ],
        notes: [
            {
                title: "Modo de Preparo Detalhado",
                content: "1. Pré-aquecer o forno a 200°C.\n2. Lavar e higienizar os tomates, a cebola, o alho e a cenoura.\n3. Descascar a cebola e cortar ao meio. Descascar o alho. Descascar e cortar a cenoura ao meio no comprimento.\n4. Cortar os tomates ao meio.\n5. Dispor todos os vegetais (tomate, cebola, alho, cenoura) em assadeiras, com a parte cortada para baixo.\n6. Regar levemente com um fio de óleo (opcional, não contabilizado).\n7. Assar no forno a 200°C por 40-50 minutos, até os vegetais estarem bem macios, caramelizados e com a casca do tomate soltando.\n8. Retirar do forno e deixar esfriar levemente (5-10 minutos).\n9. Transferir todos os vegetais assados para o liquidificador industrial.\n10. Bater até obter um molho liso e homogêneo.\n11. Coar se desejar (opcional — a fibra da cenoura pode deixar textura rústica).\n12. Transferir o molho batido para uma panela grande.\n13. Levar ao fogo médio e apurar por 20-30 minutos, mexendo ocasionalmente, até reduzir e encorpar.\n14. Adicionar o sal e ajustar o tempero.\n15. Adicionar o extrato de tomate industrializado apenas para tingir/colorir o soro do molho — mexer até incorporar bem.\n16. Incorporar a carne desfiada da 1ª etapa ao molho.\n17. Cozinhar tudo junto por mais 10 minutos em fogo baixo para integrar os sabores.\n18. Pronto o Molho Bolonhesa."
            },
            {
                title: "Pontos Críticos de Controle (PCC)",
                content: "• Higienizar todos os vegetais com solução clorada antes do preparo.\n• Assar até a caramelização completa para desenvolver sabor (reação de Maillard).\n• Bater bem no liquidificador para obter textura lisa.\n• Apurar o molho para concentrar sabor — não pular esta etapa.\n• O extrato de tomate é apenas para coloração do soro — NÃO usar em excesso.\n• Temperatura de manutenção em estufa: acima de 60°C por no máximo 6 horas."
            },
            {
                title: "Armazenamento e Validade",
                content: "• Refrigerado (0-4°C): consumir em até 72 horas.\n• Congelado (-18°C): validade de até 90 dias.\n• Reaquecer em fogo baixo, adicionando um pouco de água se necessário.\n• Não recongelar após descongelado."
            }
        ]
    };

    const preparations = [etapa1, etapa2];

    // ============================================================
    // CRIAR NOVO DOCUMENTO DE RECEITA
    // ============================================================
    const newRecipeId = generateId();
    const recipeDoc = {
        name: "Molho Bolonhesa",
        type: "receitas",
        category: "bovino",
        category_name: "Bovino",
        preparations,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'Recipe', newRecipeId), recipeDoc);

    console.log(`\n✅ Receita criada com sucesso!`);
    console.log(`   📄 ID: ${newRecipeId}`);
    console.log(`   📛 Nome: Molho Bolonhesa`);
    console.log(`   📂 Tipo: receitas (Receita Base)`);
    console.log(`   📂 Categoria: Bovino`);
    console.log(`\n   📋 Etapas criadas:`);
    preparations.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.title} (id: ${p.id})`);
        p.ingredients.forEach(ing => {
            console.log(`         - ${ing.name}: ${ing.quantity} ${ing.unit} (bruto: ${ing.weight_raw}kg → limpo: ${ing.weight_clean}kg → cozido: ${ing.weight_cooked}kg)`);
        });
        if (p.notes) {
            p.notes.forEach(n => console.log(`         📝 ${n.title}`));
        }
    });

    console.log(`\n🎉 Molho Bolonhesa — Receita criada com sucesso!`);
    setTimeout(() => process.exit(0), 1000);
}

createMolhoBolonhesa().catch(console.error);
