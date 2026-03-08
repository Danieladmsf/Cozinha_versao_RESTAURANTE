import fs from "fs";

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const COMPONENT_WEIGHTS_KG = {
    'ARROZ': 0.160,
    'FEIJAO': 0.100,
    'FAROFA': 0.020,
    'MACARRAO': 0.160,
    'PROTEÍNA': 0.165,
    'GUARNIÇÃO': 0.120,
    'PADRAO_ROTISSERIA': 1.000
};

const D76_INGREDIENT_ID = "H7tG7zLisi87NqrytfJh";

async function fixGhostRecipes() {
    console.log("Fetching missing recipes from API...");
    // We already have the missing recipes list from our API route

    // Instead of querying DB here, the user wants us to export the right recipes into products.
    // The SKILL.md says products must have packaging and portioning.
    'FAROFA': 0.020,
        'MACARRAO': 0.160,
            'PROTEÍNA': 0.165,
                'GUARNIÇÃO': 0.120,
                    'PADRAO_ROTISSERIA': 1.000 // Por padrão, se for kg (Rotisseria), vamos assumir 1kg
};

const D76_INGREDIENT_ID = "H7tG7zLisi87NqrytfJh"; // Assumido do SKILL.md

async function fixGhostRecipes() {
    console.log("Fetching recipes...");
    const recipesSnapshot = await db.collection("Recipe").get();

    let missing = [];

    recipesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isProduct !== true && (!data.preparations || data.preparations.length === 0)) {
            missing.push({ id: doc.id, ...data });
        }
    });

    console.log(`Found ${missing.length} ghost recipes to fix.`);

    for (const recipe of missing) {
        console.log(`\nFixing: ${recipe.name}`);

        let subComponents = [];
        let newPreparations = [];
        let portionWeightCalculated = 1.0;

        // Regra do SKILL.md: Produto Simples
        // 1. Etapa de Preparo Principal (Processo: cooking)
        const mainEtapaId = generateId();

        let mainWeight = 1.0;
        if (recipe.name.toLowerCase().includes("marmita") || recipe.name.toLowerCase().includes("refeicao") || recipe.name.toLowerCase().includes("refeição")) {
            // Deixar essas para depois ou script separado, pois são compostas (precisam importar outras receitas por origin_id)
            console.log("  -> Skipping Refeição/Marmita (needs composite logic)");
            continue;
        }

        newPreparations.push({
            id: mainEtapaId,
            title: `1ª Etapa: Preparo Principal (${recipe.name})`,
            processes: ['cooking'],
            ingredients: [], // Ingredientes devem ser colocados via UI depois
            notes: [
                { title: "Modo de Preparo Detalhado", content: "Preparo principal." },
                { title: "Pontos Críticos de Controle (PCC)", content: "Verificar temperaturas." },
                { title: "Armazenamento e Validade", content: "Refrigerado 0-4°C." }
            ]
        });

        subComponents.push({
            id: generateId(),
            source_id: mainEtapaId,
            assembly_weight_kg: mainWeight.toString(),
            type: 'recipe',
            name: 'Preparo Principal'
        });

        // 2. Etapa de Embalagem (Processo: packaging)
        const pkgEtapaId = generateId();
        newPreparations.push({
            id: pkgEtapaId,
            title: `2ª Etapa: Embalagem`,
            processes: ['packaging'],
            ingredients: [{
                ingredient_id: D76_INGREDIENT_ID,
                name: 'D76',
                unit: 'un',
                quantity: 1,
                current_price: 1.95, // mock
                weight_raw: "0",
                locked: true
            }],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        });

        subComponents.push({
            id: generateId(),
            source_id: pkgEtapaId,
            assembly_weight_kg: '1',
            type: 'recipe',
            name: 'Embalagem',
            isPackaging: true
        });

        // 3. Etapa de Porcionamento (Processo: portioning)
        const portEtapaId = generateId();
        newPreparations.push({
            id: portEtapaId,
            title: `3ª Etapa: Porcionamento`,
            processes: ['portioning'],
            ingredients: [],
            sub_components: subComponents,
            notes: [{
                title: "Instrução",
                content: "Porcionar conforme peso padrão registrado."
            }],
            assembly_config: {
                container_type: 'unidade',
                total_weight: '0',
                units_quantity: '1'
            }
        });

        // Atualizar firebase
        try {
            await db.collection("Recipe").doc(recipe.id).update({
                preparations: newPreparations,
                type: 'receitas_-_base', // Conforme skill.md para produto simples
                portion_weight_calculated: mainWeight,
                updatedAt: FieldValue.serverTimestamp()
            });
            console.log("  -> FIXED: Updated with Simple Product structure.");
        } catch (e) {
            console.error("  -> ERROR:", e);
        }
    }

    console.log("\nDone.");
}

fixGhostRecipes().catch(console.error);
