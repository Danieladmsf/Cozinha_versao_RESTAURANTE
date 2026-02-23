const admin = require('firebase-admin');
const sa = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function run() {
    // ============================================================
    // 1. ATUALIZAR INGREDIENTES NA COLEÇÃO "Ingredient"
    //    Definir current_price e technical_data (perdas padrão)
    // ============================================================
    const ingredientUpdates = {
        'kpDtAAfaz5nQbVQotGa7': { // Filé de Tilápia
            current_price: 32.90,
            technical_data: {
                thawing_loss_pct: '10',    // 10% perda descongelamento
                cleaning_loss_pct: '5',     // 5% aparas
                cooking_loss_pct: '15'      // 15% cocção (fritura)
            }
        },
        'bpBfEm9oUwz8t73sPIv2': { // Sal Refinado
            current_price: 2.50,
            technical_data: {}  // Sem perdas
        },
        '1BWqf9KBUdkhJydgq0Da': { // Alho Fresco
            current_price: 35.00,
            technical_data: {
                cleaning_loss_pct: '15'  // 15% casca
            }
        },
        'xlRpMydoeJ3AjOG9sIwc': { // Pimenta do Reino
            current_price: 85.00,
            technical_data: {}
        },
        'T0vI5jbPMbHw3r4A9JSl': { // Óleo de Soja
            current_price: 7.50,
            technical_data: {}
        },
        'HBQWotxo2lDEEZIwzXaz': { // Farinha de Trigo
            current_price: 4.50,
            technical_data: {}
        },
        '5esyryEnrCaoM2xC3pcb': { // Ovos (unidade ~50g)
            current_price: 12.00,
            technical_data: {
                cleaning_loss_pct: '8'   // 8% casca
            }
        },
        'udu4K2vcjKv3PEwI1uJo': { // Farinha de Rosca
            current_price: 8.90,
            technical_data: {}
        },
        'GeLIHAycPtXtUcXRy39I': { // Óleo de Soja (Fritura)
            current_price: 7.50,
            technical_data: {}
        }
    };

    console.log('📦 Atualizando Ingredientes na coleção Ingredient...\n');

    for (const [id, updates] of Object.entries(ingredientUpdates)) {
        const ref = db.collection('Ingredient').doc(id);
        const snap = await ref.get();
        if (snap.exists) {
            await ref.update(updates);
            console.log('  ✅ ' + snap.data().name + ' → R$' + updates.current_price);
        } else {
            console.log('  ❌ ID ' + id + ' não encontrado');
        }
    }

    // ============================================================
    // 2. REESCREVER A RECEITA COM DADOS LIMPOS
    //    Usando os mesmos current_price que estão nos Ingredients
    // ============================================================
    console.log('\n📝 Reescrevendo receita com dados limpos...\n');

    const idEtapa1 = generateId();
    const idEtapa2 = generateId();
    const idEtapa3 = generateId();
    const idEtapa4 = generateId();

    const preparations = [
        // ─── 1ª ETAPA: Tempero da Tilápia ───
        {
            id: idEtapa1,
            title: '1ª Etapa: Tempero da Tilápia',
            processes: ['defrosting', 'cleaning'],
            ingredients: [
                {
                    ingredient_id: 'kpDtAAfaz5nQbVQotGa7',
                    name: 'Filé de Tilápia',
                    unit: 'kg',
                    quantity: 2,
                    current_price: 32.90,
                    weight_frozen: '2,000',
                    weight_thawed: '1,800',
                    weight_raw: '1,800',
                    weight_clean: '1,710',
                    item_type: 'ingredient',
                    category: 'pescados',
                    technical_data: {
                        thawing_loss_pct: '10',
                        cleaning_loss_pct: '5',
                        cooking_loss_pct: '15'
                    }
                },
                {
                    ingredient_id: 'bpBfEm9oUwz8t73sPIv2',
                    name: 'Sal Refinado',
                    unit: 'g',
                    quantity: 8.42,
                    current_price: 2.50,
                    weight_frozen: '0,008',
                    weight_thawed: '0,008',
                    weight_raw: '0,008',
                    weight_clean: '0,008',
                    item_type: 'ingredient',
                    category: 'temperos',
                    technical_data: {}
                },
                {
                    ingredient_id: '1BWqf9KBUdkhJydgq0Da',
                    name: 'Alho Fresco',
                    unit: 'g',
                    quantity: 1.62,
                    current_price: 35.00,
                    weight_frozen: '0,002',
                    weight_thawed: '0,002',
                    weight_raw: '0,002',
                    weight_clean: '0,002',
                    item_type: 'ingredient',
                    category: 'temperos',
                    technical_data: {}
                },
                {
                    ingredient_id: 'xlRpMydoeJ3AjOG9sIwc',
                    name: 'Pimenta do Reino',
                    unit: 'g',
                    quantity: 3.24,
                    current_price: 85.00,
                    weight_frozen: '0,003',
                    weight_thawed: '0,003',
                    weight_raw: '0,003',
                    weight_clean: '0,003',
                    item_type: 'ingredient',
                    category: 'temperos',
                    technical_data: {}
                },
                {
                    ingredient_id: 'T0vI5jbPMbHw3r4A9JSl',
                    name: 'Óleo de Soja',
                    unit: 'g',
                    quantity: 6.48,
                    current_price: 7.50,
                    weight_frozen: '0,006',
                    weight_thawed: '0,006',
                    weight_raw: '0,006',
                    weight_clean: '0,006',
                    item_type: 'ingredient',
                    category: 'mercearia',
                    technical_data: {}
                }
            ],
            notes: [
                {
                    title: 'Modo de Preparo Detalhado',
                    content: '1. Descongelar os filés sob refrigeração (0-4°C) por 12-24 horas.\n2. Verificar a qualidade dos filés, descartando peças com odor ou coloração alterada.\n3. Lavar os filés em água corrente gelada.\n4. Secar bem com papel toalha, retirando toda umidade superficial.\n5. Temperar uniformemente com sal, alho, pimenta do reino e óleo.\n6. Deixar marinar por 15-20 minutos sob refrigeração (0-4°C).\n7. Reservar para etapa de empanamento.'
                },
                {
                    title: 'Pontos Críticos de Controle (PCC)',
                    content: '• Temperatura do pescado: manter abaixo de 4°C durante todo o manuseio.\n• Descongelar SEMPRE sob refrigeração, nunca em temperatura ambiente ou água morna.\n• Verificar data de validade e procedência do filé.\n• Higienizar mãos e utensílios antes do manuseio.\n• Tempo máximo fora da refrigeração: 30 minutos.\n• Evitar contaminação cruzada: usar tábua exclusiva para pescados.'
                },
                {
                    title: 'Armazenamento e Validade',
                    content: '• Refrigerado (0-4°C): consumir em até 24 horas após temperado.\n• Congelado (-18°C): validade de até 30 dias.\n• Descongelar sempre sob refrigeração, nunca em temperatura ambiente.'
                }
            ]
        },

        // ─── 2ª ETAPA: Empanamento à Milanesa ───
        {
            id: idEtapa2,
            title: '2ª Etapa: Empanamento à Milanesa',
            processes: ['cooking'],
            ingredients: [
                {
                    ingredient_id: 'HBQWotxo2lDEEZIwzXaz',
                    name: 'Farinha de Trigo',
                    unit: 'kg',
                    quantity: 0.200,
                    current_price: 4.50,
                    weight_raw: '0,200',
                    weight_pre_cooking: '0,200',
                    weight_cooked: '0,150',
                    item_type: 'ingredient',
                    category: 'mercearia',
                    technical_data: {}
                },
                {
                    ingredient_id: '5esyryEnrCaoM2xC3pcb',
                    name: 'Ovos (unidade ~50g)',
                    unit: 'un',
                    quantity: 6,
                    current_price: 12.00,
                    weight_raw: '0,360',
                    weight_pre_cooking: '0,330',
                    weight_cooked: '0,330',
                    item_type: 'ingredient',
                    category: 'frios',
                    technical_data: { cleaning_loss_pct: '8' }
                },
                {
                    ingredient_id: 'udu4K2vcjKv3PEwI1uJo',
                    name: 'Farinha de Rosca',
                    unit: 'kg',
                    quantity: 0.400,
                    current_price: 8.90,
                    weight_raw: '0,400',
                    weight_pre_cooking: '0,400',
                    weight_cooked: '0,300',
                    item_type: 'ingredient',
                    category: 'mercearia',
                    technical_data: {}
                },
                {
                    ingredient_id: 'GeLIHAycPtXtUcXRy39I',
                    name: 'Óleo de Soja (Fritura)',
                    unit: 'L',
                    quantity: 2.0,
                    current_price: 7.50,
                    weight_raw: '1,840',
                    weight_pre_cooking: '1,840',
                    weight_cooked: '1,748',
                    item_type: 'ingredient',
                    category: 'mercearia',
                    technical_data: {}
                }
            ],
            notes: [
                {
                    title: 'Modo de Preparo Detalhado',
                    content: '1. Organizar a linha de empanamento: Farinha de Trigo → Ovos batidos → Farinha de Rosca.\n2. Bater os ovos em um recipiente com um garfo, até uniformizar.\n3. Passar cada filé temperado primeiro na farinha de trigo, sacudindo o excesso.\n4. Mergulhar no ovo batido, cobrindo toda a superfície.\n5. Passar na farinha de rosca pressionando levemente para aderir.\n6. Aquecer o óleo a 170-180°C.\n7. Fritar os filés por 3-4 minutos de cada lado, até dourar uniformemente.\n8. Retirar e escorrer em papel absorvente.\n9. Verificar temperatura interna mínima de 74°C.'
                },
                {
                    title: 'Pontos Críticos de Controle (PCC)',
                    content: '• Temperatura do óleo: manter entre 170-180°C (termômetro obrigatório).\n• Temperatura interna do peixe: mínimo 74°C (verificar com termômetro de espeto).\n• Não sobrecarregar a fritadeira: fritar no máximo 3-4 filés por vez.\n• Trocar o óleo quando escurecer ou apresentar espuma excessiva.\n• Usar EPI adequado para manipulação de óleo quente.'
                },
                {
                    title: 'Armazenamento e Validade',
                    content: '• Manter em estufa quente (acima de 60°C) por no máximo 6 horas.\n• Refrigerado (0-4°C): consumir em até 48 horas.\n• Congelado (-18°C): validade de até 60 dias (reaquecer em forno 180°C por 15 min).\n• Não recongelar após descongelado.'
                },
                {
                    title: 'Dicas do Chef',
                    content: '• Para crocância extra, fazer duplo empanamento (ovo + rosca duas vezes).\n• Adicionar páprica doce e salsinha desidratada à farinha de rosca para mais sabor.\n• A temperatura do óleo é crucial: muito baixa = filé encharcado, muito alta = queima por fora e cru por dentro.\n• Pode substituir fritura por air fryer a 200°C por 12-15 minutos.'
                }
            ]
        },

        // ─── 3ª ETAPA: Embalagem (D76) ───
        {
            id: idEtapa3,
            title: '3ª Etapa: Embalagem',
            processes: ['packaging'],
            ingredients: [
                {
                    ingredient_id: 'H7tG7zLisi87NqrytfJh',
                    name: 'D76',
                    unit: 'un',
                    quantity: 1,
                    current_price: 1.95,
                    weight_raw: '0',
                    locked: true
                }
            ],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        },

        // ─── 4ª ETAPA: Porcionamento ───
        {
            id: idEtapa4,
            title: '4ª Etapa: Porcionamento',
            processes: ['portioning'],
            ingredients: [],
            sub_components: [
                {
                    id: generateId(),
                    source_id: idEtapa1,
                    assembly_weight_kg: '0,150',
                    type: 'recipe',
                    name: 'Tempero da Tilápia'
                },
                {
                    id: generateId(),
                    source_id: idEtapa2,
                    assembly_weight_kg: '0,100',
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
                    title: 'Instrução',
                    content: 'Porcionar conforme peso padrão registrado. Cada porção: ~250g (150g filé temperado + 100g empanamento aderido).'
                }
            ],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        }
    ];

    await db.collection('Recipe').doc('hMwWoqK51rPYNtuQN8zv').update({
        preparations: preparations,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n✅ Receita reescrita com dados nativos!\n');
    console.log('Resumo:');
    preparations.forEach(p => {
        console.log('  ' + p.title + ' | processes: ' + JSON.stringify(p.processes));
    });
    console.log('\n🎯 Agora ao salvar pela UI, os preços e pesos serão mantidos corretamente.');
}

run().catch(console.error).finally(() => process.exit(0));
