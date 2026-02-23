async function runMockTest() {
    const codePath = 'c:\\\\Users\\\\Administrador\\\\Desktop\\\\COZINHA RESTAURANTE\\\\lib\\\\recipe-engine\\\\RecipeEngine.js';
    // Read JS file as module or simulate it by loading it as ES import.
    const { RecipeEngine } = await import('file://' + codePath.replace(/\\\\/g, '/'));

    const mockPreparations = [
        {
            id: 'prep-1',
            title: 'Limpeza e Cocção da Carne',
            processes: ['cleaning', 'cooking'],
            ingredients: [
                {
                    name: 'Carne Bovina',
                    weight: '',
                    quantity: '5,000',
                    weight_raw: '5',
                    weight_clean: '4,5',
                    weight_pre_cooking: '4,5',
                    weight_cooked: '3,0',
                    current_price: '30,00'
                }
            ],
            equipment_costs: [
                { pop_id: 'pop-1', name: 'Mão de Obra', cost: '15,50' },
                { pop_id: 'pop-2', name: 'Gás', cost: '5,00' }
            ]
        },
        {
            id: 'prep-2',
            title: 'Montagem Final',
            processes: ['assembly'],
            sub_components: [
                {
                    name: 'Carne Bovina (Cozida)',
                    input_yield_weight: '3',
                    assembly_weight_kg: '1,5',
                    input_total_cost: '150' // 5kg * 30 BRL
                }
            ],
            equipment_costs: [
                { pop_id: 'pop-3', name: 'Embalagem', cost: '2,00' },
                { pop_id: 'pop-1', name: 'Mão de Obra', cost: '15,50' } // Should not count twice
            ]
        }
    ];

    const mockRecipe = {
        name: 'Carne de Panela',
        category: 'Prato Principal'
    };

    const metrics = RecipeEngine.calculateRecipeMetrics(mockRecipe, mockPreparations, []);

    console.log('Resultados do Mock:');
    console.log('-------------------');
    console.log('Peso Bruto Total (kg):', metrics.total_weight);
    console.log('Peso Rendimento Total (kg):', metrics.yield_weight);
    console.log('Custo Ingredientes (R$):', metrics.total_cost);
    console.log('Custo Operacional Seguro (R$):', metrics.operational_cost);
    console.log('Rendimento Global (%):', metrics.yield_percentage);

    // Verify values
    const assertions = [];
    assertions.push({
        name: 'Custo de Ingredientes',
        expected: 150 + 75, // 150 from the first prep + 75 from assembly (1.5 / 3 * 150)
        actual: metrics.total_cost
    });
    assertions.push({
        name: 'Custo Operacional Unificado (Ignorando Duplicados)',
        expected: 22.5, // 15.5 + 5 + 2
        actual: metrics.operational_cost
    });

    let passed = true;
    assertions.forEach(a => {
        if (Math.abs(a.expected - a.actual) > 0.01) {
            console.error(`[FALHA] ${a.name} -> Esperado: ${a.expected} | Obtido: ${a.actual}`);
            passed = false;
        } else {
            console.log(`[OK] ${a.name} : ${a.actual}`);
        }
    });

    if (passed) {
        console.log('\\n>>> TESTES DE INTEGRIDADE: SUCESSO. Engine Unificado Blindado.');
    } else {
        console.log('\\n>>> TESTES DE INTEGRIDADE: FALHA. Favor revisar RecipeEngine.');
    }
}

runMockTest().catch(console.error);
