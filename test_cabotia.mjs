const recipes = [
    {
        "name": "Rotisseria Purê de Cabotia Bendito Kg",
        "portion_weight_calculated": 1.13,
        "entityType": "recipe",
        "preparations": [
            {
                "title": "3º Etapa: Porcionamento",
                "assembly_config": {
                    "units_quantity": "1",
                    "container_type": "cuba",
                    "unit_type": "kg"
                },
                "sub_components": [
                    {
                        "assembly_weight_kg": "0,130",
                        "name": "1º Etapa: Purê de Cabotiá",
                        "type": "preparation"
                    },
                    {
                        "assembly_weight_kg": "1",
                        "name": "2º Etapa: Embalagem",
                        "type": "preparation"
                    }
                ]
            }
        ]
    }
];

const item = {
    recipe_id: "mItwpcJdKcrNXS5ZnAc7",
    quantity: 4,
    unit_type: "un", // <- It's already arriving as 'un', so dividing 4 by 0.13 is wrong
    recipe_name: "Rotisseria Purê de Cabotia Bendito Kg"
};

const formatQuantityDisplay = (item) => {
    let quantity = item.quantity ?? 0;
    quantity = Math.round(quantity * 1000) / 1000;

    // A unidade ORIGINAL do pedido
    let originalUnitType = (item.unit_type || "").toLowerCase();

    let unitType = item.unit_type;
    let unitsQuantity = 1;
    let portionWeight = 0;
    let assemblyUnitType = null;
    let isUnitBased = false;

    if (originalUnitType === 'porção' || originalUnitType === 'porcao' || originalUnitType === 'un' || originalUnitType === 'unidades') {
        originalUnitType = 'unidade';
    }

    let recipe = null;
    if (item.recipe_id || item.recipe_name) {
        if (item.recipe_id) {
            recipe = recipes.find(r => r.id === item.recipe_id);
        }
        if (recipe && recipe.entityType === 'product' && item.recipe_name) {
            const fichaTecnica = recipes.find(r => r.entityType === 'recipe' && r.name?.toLowerCase().trim() === item.recipe_name.toLowerCase().trim());
            if (fichaTecnica) recipe = fichaTecnica;
        }
        if (!recipe && item.recipe_name) {
            recipe = recipes.find(r => r.entityType === 'recipe' && r.name?.toLowerCase().trim() === item.recipe_name.toLowerCase().trim())
                || recipes.find(r => r.name?.toLowerCase().trim() === item.recipe_name.toLowerCase().trim());
        }

        if (recipe) {
            let innerPortionWeight = 0;
            if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep.sub_components && lastPrep.sub_components.length > 0) {
                    innerPortionWeight = lastPrep.sub_components.reduce((sum, sub) => {
                        const w = parseFloat(String(sub.assembly_weight_kg).replace(',', '.')) || 0;
                        return (w < 1) ? sum + w : sum;
                    }, 0);
                }
                if (lastPrep.assembly_config) {
                    unitsQuantity = parseFloat(lastPrep.assembly_config.units_quantity) || 1;
                    assemblyUnitType = lastPrep.assembly_config.unit_type || lastPrep.assembly_config.container_type;
                }
            }

            if (recipe.portion_weight_calculated && recipe.portion_weight_calculated > 0) {
                portionWeight = recipe.portion_weight_calculated;
            } else if (recipe.cuba_weight && Number(recipe.cuba_weight) > 0) {
                portionWeight = Number(recipe.cuba_weight);
            } else if (recipe.yield_weight && Number(recipe.yield_weight) > 0) {
                portionWeight = Number(recipe.yield_weight);
            } else if (innerPortionWeight > 0) {
                portionWeight = innerPortionWeight;
            }

            // CORREÇÃO: Pegar o subcomponente se o cálculo global bater errado e for muito maior
            if (innerPortionWeight > 0 && innerPortionWeight < portionWeight) {
                portionWeight = innerPortionWeight;
            }

            if (assemblyUnitType) {
                unitType = assemblyUnitType;
            } else if (!unitType) {
                unitType = recipe.container_type || recipe.unit_type;
            }

            const recipeNameHasKg = recipe.name && recipe.name.toUpperCase().endsWith('KG');
            if (recipeNameHasKg) {
                unitType = 'kg';
            }
        }
    }

    if (unitType) {
        unitType = unitType.toLowerCase();
    }

    if (unitType === 'porção' || unitType === 'porcao' || unitType === 'un' || unitType === 'unidades') {
        unitType = 'unidade';
        isUnitBased = true;
    }
    if (unitType === 'quilo') {
        unitType = 'kg';
    }

    console.log({ originalUnitType, unitType, portionWeight, quantity, isUnitBased });

    // === LÓGICA DE PRODUÇÃO / CÁLCULO DE EMBALAGENS ===

    // Se a unidade ORIGINAL do pedido já for de Unidade (e não kg ou gramas puros), 
    // a quantidade representa DE FATO a quantidade de embalagens! Não podemos dividir de novo.
    if (originalUnitType === 'unidade' && portionWeight > 0) {
        const portionGrams = Math.round(portionWeight * 1000);
        return `${quantity} emb (${portionGrams}g)`;
    }

    // Se o pedido chegou em KG mas a gente tem a porção correta, calcula a qt. dividindo
    if (unitType === 'kg' && portionWeight > 0 && quantity > 0) {
        const numPackages = Math.ceil(quantity / portionWeight);
        const portionGrams = Math.round(portionWeight * 1000);
        return `${numPackages} emb (${portionGrams}g)`;
    }

    if (unitType === 'unidade') {
        const finalQuantity = Math.round((quantity * unitsQuantity) * 100) / 100;
        return `${String(finalQuantity).replace('.', ',')} unidade`;
    }

    if (unitType === 'cuba') {
        unitType = '';
    }

    const formattedQty = String(Math.round(quantity * 100) / 100).replace('.', ',');
    const displayUnit = unitType || '';
    return `${formattedQty} ${displayUnit}`.trim();
};

console.log("Result Cabotia orig:un (4 emb):", formatQuantityDisplay({ ...item, quantity: 4, unit_type: 'un' }));
