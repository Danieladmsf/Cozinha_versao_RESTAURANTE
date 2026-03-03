import { db } from '../lib/firebase.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Gerador de IDs únicos (conforme SKILL.md §8.3)
const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// ============================================================
// STROGONOFF DE CARNE — RECEITA BASE (type: 'receitas')
// ID existente no Firestore: ppfc2vdOZQNUPrm1yBcq
// Categoria: Bovino
// Etapas: 2 (Corte/Tempero + Molho Strogonoff)
// SEM embalagem, SEM porcionamento (é receita base)
// ============================================================

async function createStrogonoffCarneFicha() {
    const RECIPE_ID = 'CYdNaVWVXdput1Qc5dS2';

    console.log("🥩 Criando Ficha Técnica: Strogonoff de Carne...\n");

    // Verificar se a receita existe
    const recipeSnap = await getDoc(doc(db, 'Recipe', RECIPE_ID));
    if (!recipeSnap.exists()) {
        console.error(`❌ Receita ${RECIPE_ID} não encontrada no Firestore!`);
        process.exit(1);
    }

    const recipeData = recipeSnap.data();
    console.log(`✅ Receita encontrada: "${recipeData.name}" (Cat: ${recipeData.category_name || recipeData.category})`);

    if (recipeData.preparations && recipeData.preparations.length > 0) {
        console.log(`⚠️  ATENÇÃO: Esta receita JÁ TEM ${recipeData.preparations.length} etapas!`);
        console.log(`   Sobrescrevendo as etapas existentes...`);
    }

    // ============================================================
    // IDs das etapas
    // ============================================================
    const idEtapa1 = generateId(); // Corte e Tempero da Carne
    const idEtapa2 = generateId(); // Molho Strogonoff

    // ============================================================
    // CÁLCULO DO TEMPERO (conforme SKILL.md §2)
    // Proteína bovina: tempero base padrão
    // Base: 3 kg de carne bovina (acém em cubos)
    // Reduzir sal em 30% porque o molho é salgado (ketchup, mostarda)
    // ============================================================
    const pesoProteina = 3.0; // kg de carne bovina

    const sal = +(4.21 * 0.70 * pesoProteina).toFixed(2);   // 8.84g (reduzido 30% por molho salgado)
    const alho = +(1.62 * pesoProteina).toFixed(2);          // 4.86g
    const pimenta = +(1.62 * pesoProteina).toFixed(2);       // 4.86g
    const oleo = +(3.24 * pesoProteina).toFixed(2);          // 9.72g
    const paprica = +(0.81 * pesoProteina).toFixed(2);       // 2.43g

    // ============================================================
    // PREPARATIONS (2 ETAPAS)
    // ============================================================
    const preparations = [
        // ──────────────────────────────────────────────────────────
        // 1ª ETAPA: Corte e Tempero da Carne
        // Carne bovina: Perda limpeza 8%, Perda cocção 25%
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa1,
            title: "1ª Etapa: Corte e Tempero da Carne",
            processes: ['seasoning'],
            ingredients: [
                {
                    name: "Acém (Carne Bovina em Cubos)",
                    unit: "kg",
                    quantity: pesoProteina,
                    weight_raw: "3.000",
                    weight_clean: "2.760",   // 8% perda limpeza (gordura, nervos)
                    weight_cooked: "2.070",  // 25% perda cocção (selado)
                    loss_clean: "8",
                    loss_cook: "25",
                    item_type: "ingredient",
                    category: "carnes"
                },
                {
                    name: "Sal Refinado",
                    unit: "g",
                    quantity: sal,
                    weight_raw: (sal / 1000).toFixed(4),
                    weight_clean: (sal / 1000).toFixed(4),
                    weight_cooked: (sal / 1000).toFixed(4),
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "temperos"
                },
                {
                    name: "Alho Fresco",
                    unit: "g",
                    quantity: alho,
                    weight_raw: (alho / 1000).toFixed(4),
                    weight_clean: (alho / 1000).toFixed(4),
                    weight_cooked: (alho / 1000).toFixed(4),
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "temperos"
                },
                {
                    name: "Pimenta do Reino",
                    unit: "g",
                    quantity: pimenta,
                    weight_raw: (pimenta / 1000).toFixed(4),
                    weight_clean: (pimenta / 1000).toFixed(4),
                    weight_cooked: (pimenta / 1000).toFixed(4),
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "temperos"
                },
                {
                    name: "Óleo de Soja",
                    unit: "g",
                    quantity: oleo,
                    weight_raw: (oleo / 1000).toFixed(4),
                    weight_clean: (oleo / 1000).toFixed(4),
                    weight_cooked: (oleo / 1000).toFixed(4),
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Páprica Doce",
                    unit: "g",
                    quantity: paprica,
                    weight_raw: (paprica / 1000).toFixed(4),
                    weight_clean: (paprica / 1000).toFixed(4),
                    weight_cooked: (paprica / 1000).toFixed(4),
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "temperos"
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo Detalhado",
                    content: "1. Receber a peça de acém e verificar a qualidade (cor, odor, textura).\n2. Limpar retirando nervos, gordura excessiva e aponevroses.\n3. Cortar em cubos de aproximadamente 2x2 cm, uniformes.\n4. Em um recipiente, temperar os cubos com sal, alho triturado, pimenta do reino, páprica doce e óleo.\n5. Misturar bem garantindo que todos os cubos fiquem cobertos.\n6. Deixar marinar por no mínimo 30 minutos sob refrigeração (0-4°C).\n7. Aquecer uma frigideira/panela grande com um fio de óleo em fogo alto.\n8. Selar a carne em pequenas quantidades, sem amontoar, até dourar por todos os lados.\n9. Reservar a carne selada para montagem do molho na 2ª etapa."
                },
                {
                    title: "Pontos Críticos de Controle (PCC)",
                    content: "• Temperatura da carne ao receber: máximo 7°C.\n• Higienizar mãos, tábuas e facas antes do corte.\n• Usar tábua vermelha exclusiva para carnes.\n• Tempo máximo fora da refrigeração durante preparo: 30 minutos.\n• Selar em fogo alto sem mexer muito para criar crosta (reação de Maillard).\n• Contaminação cruzada: não reutilizar recipiente do tempero cru sem higienizar."
                },
                {
                    title: "Armazenamento e Validade",
                    content: "• Carne temperada crua (refrigerada 0-4°C): consumir em até 24 horas.\n• Carne selada (refrigerada 0-4°C): consumir em até 48 horas.\n• Congelada (-18°C): validade de até 90 dias.\n• Descongelar sempre sob refrigeração, nunca em temperatura ambiente."
                }
            ]
        },

        // ──────────────────────────────────────────────────────────
        // 2ª ETAPA: Molho Strogonoff
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa2,
            title: "2ª Etapa: Molho Strogonoff",
            processes: ['cooking'],
            ingredients: [
                {
                    name: "Cebola Branca",
                    unit: "kg",
                    quantity: 0.500,
                    weight_raw: "0.500",
                    weight_clean: "0.425",   // 15% perda descasque
                    weight_cooked: "0.340",  // 20% redução cocção
                    loss_clean: "15",
                    loss_cook: "20",
                    item_type: "ingredient",
                    category: "hortifruti"
                },
                {
                    name: "Manteiga sem Sal",
                    unit: "kg",
                    quantity: 0.100,
                    weight_raw: "0.100",
                    weight_clean: "0.100",
                    weight_cooked: "0.100",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "frios"
                },
                {
                    name: "Cogumelo Champignon Fatiado (lata)",
                    unit: "kg",
                    quantity: 0.300,
                    weight_raw: "0.300",
                    weight_clean: "0.300",
                    weight_cooked: "0.270",
                    loss_clean: "0",
                    loss_cook: "10",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Ketchup",
                    unit: "kg",
                    quantity: 0.250,
                    weight_raw: "0.250",
                    weight_clean: "0.250",
                    weight_cooked: "0.250",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Mostarda Amarela",
                    unit: "kg",
                    quantity: 0.100,
                    weight_raw: "0.100",
                    weight_clean: "0.100",
                    weight_cooked: "0.100",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Creme de Leite",
                    unit: "kg",
                    quantity: 0.600,
                    weight_raw: "0.600",
                    weight_clean: "0.600",
                    weight_cooked: "0.600",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "frios"
                },
                {
                    name: "Molho de Tomate",
                    unit: "kg",
                    quantity: 0.400,
                    weight_raw: "0.400",
                    weight_clean: "0.400",
                    weight_cooked: "0.340",
                    loss_clean: "0",
                    loss_cook: "15",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Molho Inglês",
                    unit: "g",
                    quantity: 15,
                    weight_raw: "0.0150",
                    weight_clean: "0.0150",
                    weight_cooked: "0.0150",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Batata Palha",
                    unit: "kg",
                    quantity: 0.200,
                    weight_raw: "0.200",
                    weight_clean: "0.200",
                    weight_cooked: "0.200",
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo Detalhado",
                    content: "1. Picar a cebola em cubos pequenos (brunoise).\n2. Em uma panela grande, derreter a manteiga em fogo médio.\n3. Refogar a cebola até ficar translúcida e levemente dourada (~5 min).\n4. Adicionar o cogumelo champignon escorrido e refogar por mais 2 minutos.\n5. Incorporar o molho de tomate e deixar apurar por 3-4 minutos.\n6. Adicionar o ketchup e a mostarda, misturando bem.\n7. Adicionar o molho inglês para dar profundidade de sabor.\n8. Incorporar a carne selada (da 1ª etapa) ao molho.\n9. Cozinhar em fogo médio-baixo por 10-15 minutos até a carne ficar macia e o molho encorpar.\n10. Desligar o fogo e adicionar o creme de leite, misturando delicadamente.\n11. NÃO deixar ferver após o creme de leite para evitar talhamento.\n12. Ajustar sal e pimenta se necessário.\n13. Servir imediatamente acompanhado de arroz branco e batata palha."
                },
                {
                    title: "Pontos Críticos de Controle (PCC)",
                    content: "• Temperatura de cocção: manter acima de 74°C no centro da carne.\n• Creme de leite: adicionar SOMENTE com o fogo desligado ou muito baixo.\n• Se ferver após o creme de leite, o molho talha (textura granulosa).\n• Verificar validade de todos os ingredientes enlatados/embalados.\n• Manter a panela tampada durante o cozimento para evitar ressecamento.\n• Temperatura de manutenção em estufa: acima de 60°C por no máximo 6 horas."
                },
                {
                    title: "Armazenamento e Validade",
                    content: "• Refrigerado (0-4°C): consumir em até 72 horas.\n• Congelado (-18°C): validade de até 90 dias.\n• Reaquecer em fogo baixo, adicionando um pouco de creme de leite fresco se necessário.\n• Batata palha servir separadamente, na hora, para manter a crocância.\n• Não recongelar após descongelado."
                },
                {
                    title: "Dicas do Chef",
                    content: "• Para um molho mais encorpado, pode adicionar 1 colher de amido de milho dissolvido em água fria antes do creme de leite.\n• A batata palha é adicionada como guarnição na hora de servir, nunca misturada ao molho.\n• Pode substituir o acém por filé mignon para versão premium (reduzir cocção para 5 min).\n• Para versão mais leve, usar creme de leite light ou iogurte grego natural.\n• O cogumelo em conserva pode ser substituído por champignon fresco (200g, fatiar e refogar antes)."
                }
            ]
        }
    ];

    // ============================================================
    // ATUALIZAR O DOCUMENTO EXISTENTE (updateDoc)
    // ============================================================
    await updateDoc(doc(db, 'Recipe', RECIPE_ID), {
        preparations: preparations,
        updatedAt: serverTimestamp()
    });

    console.log(`\n✅ Ficha Técnica populada com sucesso!`);
    console.log(`   📄 ID: ${RECIPE_ID}`);
    console.log(`   📛 Nome: ${recipeData.name}`);
    console.log(`   📂 Tipo: receitas (Receita Base)`);
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

    console.log(`\n🎉 Strogonoff de Carne — Ficha Técnica completa!`);
    setTimeout(() => process.exit(0), 1000);
}

createStrogonoffCarneFicha().catch(console.error);
