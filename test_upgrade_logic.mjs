const recipes = [
    {
        "name": "Rotisseria Feijao Bendito Kg",
        "yield_weight": 0.18,
        "entityType": "recipe",
        "preparations": [
            {
                "assembly_config": {
                    "container_type": "quilo",
                    "units_quantity": "1",
                    "unit_type": "kg"
                },
                "sub_components": [
                    {
                        "assembly_weight_kg": "0.18",
                        "name": "1º Etapa: Feijão"
                    }
                ]
            }
        ]
    }
];

const item = {
    recipe_id: "Ffu3OXlrBFNheRwpC5vC",
    quantity: 1.02,
    unit_type: "kg",
    recipe_name: "Rotisseria Feijao Bendito Kg"
};

const formatQuantityDisplay = (item) => {
    let quantity = item.quantity ?? 0;
    quantity = Math.round(quantity * 1000) / 1000;

    let unitType = item.unit_type;
    let unitsQuantity = 1;
    let portionWeight = 0;
    let assemblyUnitType = null;

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
            if (recipe.portion_weight_calculated && recipe.portion_weight_calculated > 0) {
                portionWeight = recipe.portion_weight_calculated;
            } else if (recipe.cuba_weight && Number(recipe.cuba_weight) > 0) {
                portionWeight = Number(recipe.cuba_weight);
            } else if (recipe.yield_weight && Number(recipe.yield_weight) > 0) {
                portionWeight = Number(recipe.yield_weight);
            } else if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep.sub_components && lastPrep.sub_components.length > 0) {
                    portionWeight = lastPrep.sub_components.reduce((sum, sub) => sum + (parseFloat(sub.assembly_weight_kg) || 0), 0);
                }
            }

            if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep.assembly_config) {
                    unitsQuantity = parseFloat(lastPrep.assembly_config.units_quantity) || 1;
                    assemblyUnitType = lastPrep.assembly_config.unit_type || lastPrep.assembly_config.container_type;
                }
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
    }
    if (unitType === 'quilo') {
        unitType = 'kg';
    }

    console.log({ unitType, portionWeight, quantity, numPackages: portionWeight > 0 ? Math.ceil(quantity / portionWeight) : 0 });

    // === LÓGICA DE PRODUÇÃO / CÁLCULO DE EMBALAGENS ===
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

console.log("Result:", formatQuantityDisplay(item));
