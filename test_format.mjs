const recipe = {
    "operational_cost": 0,
    "cuba_weight": 0.12,
    "name": "Rotisseria Arroz Branco Bendito Kg",
    "portion_cost": 14.109777015437393,
    "has_ingredients": true,
    "has_assembly": true,
    "category_name": "MONO ARROZ (ALMOÇO)",
    "yield_weight": 0.12,
    "container_type": "cuba",
    "total_weight": 1.2277498830500546,
    "portion_weight_calculated": 0.12,
    "preparation_metrics": [
    ],
    "category": "MONO ARROZ (ALMOÇO)",
    "prep_time": 0,
    "is_valid": true,
    "category_id": "5DZfjeRbthB9M61rFRBz",
    "preparations": [
        {
            "title": "2º Etapa: Porcionamento",
            "assembly_config": {
                "units_quantity": "1",
                "container_type": "cuba",
                "unit_type": "kg",
                "notes": "",
                "total_weight": ""
            }
        }
    ],
    "id": "3pTB0f29hUIp66jBXI0G",
    "cuba_cost": 14.109777015437393,
    "type": "produtos"
};

const recipes = [recipe];

const item = {
    recipe_id: "3pTB0f29hUIp66jBXI0G",
    quantity: 1.6,
    unit_type: "kg",
    recipe_name: "Rotisseria Arroz Branco Bendito Kg"
};

const formatQuantityDisplay = (item) => {
    let quantity = item.quantity ?? 0;
    quantity = Math.round(quantity * 1000) / 1000;

    let unitType = item.unit_type;
    let unitsQuantity = 1;
    let portionWeight = 0;
    let assemblyUnitType = null;

    let recipe = null;
    if (item.recipe_id) {
        recipe = recipes.find(r => r.id === item.recipe_id);

        if (recipe) {
            if (recipe.portion_weight_calculated && recipe.portion_weight_calculated > 0) {
                portionWeight = recipe.portion_weight_calculated;
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

    console.log({ unitType, portionWeight, quantity, numPackages: Math.ceil(quantity / portionWeight) });

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
