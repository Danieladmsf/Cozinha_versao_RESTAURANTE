const admin = require('firebase-admin');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Gerador de IDs únicos (conforme SKILL.md)
const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function createTilapiaMilanesa() {
    console.log("🐟 Criando receita: Filé de Tilápia à Milanesa...\n");

    // ============================================================
    // IDs das etapas (gerados previamente para referência cruzada)
    // ============================================================
    const idEtapa1 = generateId(); // Tempero da Tilápia
    const idEtapa2 = generateId(); // Empanamento à Milanesa
    const idEtapa3 = generateId(); // Embalagem
    const idEtapa4 = generateId(); // Porcionamento

    // ============================================================
    // CÁLCULO DO TEMPERO (conforme SKILL.md §2)
    // Pescado delicado: omitir páprica, reduzir alho em 50%
    // Base: 2 kg de filé de tilápia
    // ============================================================
    const pesoProteina = 2.0; // kg de filé de tilápia

    const sal = +(4.21 * pesoProteina).toFixed(2);     // 8.42g
    const alho = +(1.62 * 0.5 * pesoProteina).toFixed(2); // 1.62g (reduzido 50% para pescado)
    const pimenta = +(1.62 * pesoProteina).toFixed(2);     // 3.24g
    const oleo = +(3.24 * pesoProteina).toFixed(2);     // 6.48g
    // Páprica OMITIDA para pescado delicado

    // ============================================================
    // CADEIA DE PESOS (conforme SKILL.md §4)
    // Pescados: Perda limpeza 5% (filé já limpo), Perda cocção 10-15%
    // ============================================================

    const preparations = [
        // ──────────────────────────────────────────────────────────
        // 1ª ETAPA: Tempero da Tilápia
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa1,
            title: "1ª Etapa: Tempero da Tilápia",
            processes: ['seasoning'],
            ingredients: [
                {
                    name: "Filé de Tilápia",
                    unit: "kg",
                    quantity: pesoProteina,
                    weight_raw: "2.000",
                    weight_clean: "1.900",  // ~5% perda (aparas leves do filé)
                    weight_cooked: "1.900", // Não cozinha nesta etapa
                    loss_clean: "5",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "pescados"
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
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo Detalhado",
                    content: "1. Verificar a qualidade dos filés de tilápia, descartando peças com odor ou coloração alterada.\n2. Lavar os filés em água corrente gelada.\n3. Secar bem com papel toalha, retirando toda umidade superficial.\n4. Temperar uniformemente com sal, alho, pimenta do reino e óleo.\n5. Deixar marinar por 15-20 minutos sob refrigeração (0-4°C).\n6. Reservar para etapa de empanamento."
                },
                {
                    title: "Pontos Críticos de Controle (PCC)",
                    content: "• Temperatura do pescado: manter abaixo de 4°C durante todo o manuseio.\n• Verificar data de validade e procedência do filé.\n• Higienizar mãos e utensílios antes do manuseio.\n• Tempo máximo fora da refrigeração: 30 minutos.\n• Evitar contaminação cruzada: usar tábua exclusiva para pescados."
                },
                {
                    title: "Armazenamento e Validade",
                    content: "• Refrigerado (0-4°C): consumir em até 24 horas após temperado.\n• Congelado (-18°C): validade de até 30 dias.\n• Descongelar sempre sob refrigeração, nunca em temperatura ambiente."
                }
            ]
        },

        // ──────────────────────────────────────────────────────────
        // 2ª ETAPA: Empanamento à Milanesa
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa2,
            title: "2ª Etapa: Empanamento à Milanesa",
            processes: ['breading'],
            ingredients: [
                {
                    name: "Farinha de Trigo",
                    unit: "kg",
                    quantity: 0.200,
                    weight_raw: "0.200",
                    weight_clean: "0.200",
                    weight_cooked: "0.150",  // parte se perde no processo
                    loss_clean: "0",
                    loss_cook: "25",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Ovo Inteiro",
                    unit: "un",
                    quantity: 6,
                    weight_raw: "0.360",   // ~60g por ovo
                    weight_clean: "0.330", // ~8% casca
                    weight_cooked: "0.330",
                    loss_clean: "8",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "frios"
                },
                {
                    name: "Farinha de Rosca",
                    unit: "kg",
                    quantity: 0.400,
                    weight_raw: "0.400",
                    weight_clean: "0.400",
                    weight_cooked: "0.300", // parte não adere
                    loss_clean: "0",
                    loss_cook: "25",
                    item_type: "ingredient",
                    category: "mercearia"
                },
                {
                    name: "Óleo de Soja (fritura)",
                    unit: "L",
                    quantity: 2.0,
                    weight_raw: "1.840",   // ~0.92 kg/L
                    weight_clean: "1.840",
                    weight_cooked: "1.840", // óleo de fritura por imersão (reutilizável, absorção mínima)
                    loss_clean: "0",
                    loss_cook: "0",
                    item_type: "ingredient",
                    category: "mercearia"
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo Detalhado",
                    content: "1. Organizar a linha de empanamento: Farinha de Trigo → Ovos batidos → Farinha de Rosca.\n2. Bater os ovos em um recipiente com um garfo, até uniformizar.\n3. Passar cada filé temperado primeiro na farinha de trigo, sacudindo o excesso.\n4. Mergulhar no ovo batido, cobrindo toda a superfície.\n5. Passar na farinha de rosca pressionando levemente para aderir.\n6. Aquecer o óleo a 170-180°C.\n7. Fritar os filés por 3-4 minutos de cada lado, até dourar uniformemente.\n8. Retirar e escorrer em papel absorvente.\n9. Verificar temperatura interna mínima de 74°C."
                },
                {
                    title: "Pontos Críticos de Controle (PCC)",
                    content: "• Temperatura do óleo: manter entre 170-180°C (termômetro obrigatório).\n• Temperatura interna do peixe: mínimo 74°C (verificar com termômetro de espeto).\n• Não sobrecarregar a fritadeira: fritar no máximo 3-4 filés por vez.\n• Trocar o óleo quando escurecer ou apresentar espuma excessiva.\n• Usar EPI adequado para manipulação de óleo quente."
                },
                {
                    title: "Armazenamento e Validade",
                    content: "• Manter em estufa quente (acima de 60°C) por no máximo 6 horas.\n• Refrigerado (0-4°C): consumir em até 48 horas.\n• Congelado (-18°C): validade de até 60 dias (reaquecer em forno 180°C por 15 min).\n• Não recongelar após descongelado."
                },
                {
                    title: "Dicas do Chef",
                    content: "• Para crocância extra, fazer duplo empanamento (ovo + rosca duas vezes).\n• Adicionar páprica doce e salsinha desidratada à farinha de rosca para mais sabor.\n• A temperatura do óleo é crucial: muito baixa = filé encharcado, muito alta = queima por fora e cru por dentro.\n• Pode substituir fritura por air fryer a 200°C por 12-15 minutos."
                }
            ]
        },

        // ──────────────────────────────────────────────────────────
        // 3ª ETAPA: Embalagem (D76)
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa3,
            title: "3ª Etapa: Embalagem",
            processes: ['packaging'],
            ingredients: [
                {
                    ingredient_id: 'H7tG7zLisi87NqrytfJh',
                    name: 'D76',
                    unit: 'un',
                    quantity: 1,
                    current_price: 1.95,
                    weight_raw: "0",
                    locked: true
                }
            ],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        },

        // ──────────────────────────────────────────────────────────
        // 4ª ETAPA: Porcionamento
        // ──────────────────────────────────────────────────────────
        {
            id: idEtapa4,
            title: "4ª Etapa: Porcionamento",
            processes: ['portioning'],
            ingredients: [],
            sub_components: [
                {
                    id: generateId(),
                    source_id: idEtapa1,
                    assembly_weight_kg: '0.150',
                    type: 'recipe',
                    name: 'Tempero da Tilápia'
                },
                {
                    id: generateId(),
                    source_id: idEtapa2,
                    assembly_weight_kg: '0.100',
                    type: 'recipe',
                    name: 'Empanamento à Milanesa'
                },
                {
                    id: generateId(),
                    source_id: idEtapa3,
                    assembly_weight_kg: '1',
                    type: 'recipe',
                    name: 'Embalagem',
                    isPackaging: true
                }
            ],
            notes: [
                {
                    title: "Instrução",
                    content: "Porcionar conforme peso padrão registrado. Cada porção: ~250g (150g filé temperado + 100g empanamento aderido)."
                }
            ],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        }
    ];

    // ============================================================
    // DOCUMENTO PRINCIPAL DA RECEITA
    // ============================================================
    const recipe = {
        name: "Filé de Tilápia à Milanesa",
        type: "receitas",
        category: "pescado",
        code: "",
        preparations: preparations,
        portion_weight_calculated: 0.250,
        unit_type: "kg",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Salvar no Firestore
    const docRef = await db.collection('Recipe').add(recipe);
    console.log(`✅ Receita criada com sucesso!`);
    console.log(`   📄 ID: ${docRef.id}`);
    console.log(`   📛 Nome: ${recipe.name}`);
    console.log(`   📂 Categoria: ${recipe.category}`);
    console.log(`   📦 Tipo: ${recipe.type}`);
    console.log(`   ⚖️  Peso porção: ${recipe.portion_weight_calculated} kg (${recipe.portion_weight_calculated * 1000}g)`);
    console.log(`\n   📋 Etapas:`);
    preparations.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.title} (id: ${p.id})`);
        if (p.ingredients.length > 0) {
            p.ingredients.forEach(ing => {
                console.log(`         - ${ing.name}: ${ing.quantity} ${ing.unit}`);
            });
        }
        if (p.sub_components) {
            p.sub_components.forEach(sc => {
                console.log(`         → ${sc.name}: ${sc.assembly_weight_kg} kg`);
            });
        }
    });

    console.log(`\n🎉 Receita "Filé de Tilápia à Milanesa" salva no Firebase com sucesso!`);
}

createTilapiaMilanesa().catch(console.error).finally(() => process.exit(0));
