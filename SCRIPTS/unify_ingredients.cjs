const admin = require('firebase-admin');

const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// O formato: { principalName: [ "variacao 1", "variacao 2" ] }
const UNIFICATION_GROUPS = {
    "Bacon": [
        "Bacon Fatiado",
        "Bacon Em Fatias",
        "Bacon Em Cubos",
        "Bacon Cubos"
    ],
    "Acém": [
        "Acém Em Peça",
        "Acém Em Cubos",
        "Carne Moída (acém)"
    ],
    "Coxão Duro": [
        "Coxão Duro Em Peça",
        "Coxão Duro (peça)"
    ],
    "Patinho": [
        "Patinho Moído"
    ],
    "Bacalhau": [
        "Bacalhau Desfiado",
        "Bacalhau Em Lasca"
    ],
    "Peito de Frango": [
        "Peito De Frango Limpo",
        "Peito De Frango Sem Osso"
    ]
};

async function run() {
    console.log("Iniciando Mapeamento dos Insumos...");

    const ingSnap = await db.collection('Ingredient').get();
    const allIngredients = [];
    ingSnap.forEach(doc => {
        allIngredients.push({ id: doc.id, ...doc.data() });
    });

    const mapping = {};
    const toDeleteIds = [];

    // 1. Identificar Principais e Duplicados
    for (const [principalName, variations] of Object.entries(UNIFICATION_GROUPS)) {
        // Encontrar o Ingrediente principal (se já existe)
        // Match exato, ignorando case (preferencialmente procurar o exato primeiro)
        let principalIngredient = allIngredients.find(i => i.name.toLowerCase() === principalName.toLowerCase());

        // Se não existir o principal exato, vamos criar log e talvez pegar a primeira variação para ser o principal e renomear?
        // Mas a lógica mais segura é ver se temos o principal.
        let isNewPrincipal = false;
        if (!principalIngredient) {
            console.log(`[Aviso] Insumo Base '${principalName}' não encontrado exatamente. Procurando o mais votado das variações...`);
            const firstFoundVariation = allIngredients.find(i => variations.map(v => v.toLowerCase()).includes(i.name.toLowerCase()));
            if (firstFoundVariation) {
                principalIngredient = firstFoundVariation;
                console.log(`  -> Adotando '${firstFoundVariation.name}' (${firstFoundVariation.id}) e o renomeando para '${principalName}'.`);
                // A renomeação em si será feita no banco na parte de updates
                isNewPrincipal = true;
            } else {
                console.log(`  -> Nenhuma variação de '${principalName}' encontrada no banco. Ignorando este grupo.`);
                continue;
            }
        } else {
            console.log(`Encontrado principal: '${principalIngredient.name}' (${principalIngredient.id})`);
        }

        mapping[principalName] = {
            principal: principalIngredient,
            renameTo: isNewPrincipal ? principalName : null,
            variationsFound: []
        };

        // Identificar as variações (incluindo duplicates do principal se existirem)
        // Procuramos por nomes na lista de variações E também pelo mesmo nome do principal (pra limpar duplicados 100% iguais)
        const targetNames = [principalName.toLowerCase(), ...variations.map(v => v.toLowerCase())];

        allIngredients.forEach(ing => {
            if (ing.id !== principalIngredient.id) { // Não processar o que já elegemos como principal
                if (targetNames.includes(ing.name.toLowerCase())) {
                    mapping[principalName].variationsFound.push(ing);
                    toDeleteIds.push(ing.id);
                }
            }
        });

        console.log(`  -> Variações encontradas para unificar em '${principalName}': ${mapping[principalName].variationsFound.map(v => v.name).join(', ')}`);
    }

    if (Object.keys(mapping).length === 0) {
        console.log("Nenhum grupo para processar.");
        return;
    }

    console.log("\nBuscando Fichas Técnicas para Atualizar...");
    const recSnap = await db.collection('Recipe').get();
    let updatedRecipesCount = 0;

    const batch = db.batch(); // Usar batch para garantir as alterações (até 500 ops por batch)
    let batchOperations = 0;

    recSnap.forEach(doc => {
        let recipeData = doc.data();
        let changed = false;

        if (recipeData.preparations) {
            recipeData.preparations.forEach((prep, pIdx) => {
                if (prep.ingredients) {
                    prep.ingredients.forEach((ing, iIdx) => {
                        // Verificar se o ingrediente na receita é alguma das variações a serem substituídas

                        for (const [principalName, groupData] of Object.entries(mapping)) {
                            // Se o ing.ingredient_id (ou id) está na lista de variacoes a deletar, atualizamos
                            const isMatchedVariation = groupData.variationsFound.find(
                                v => v.id === ing.ingredient_id || v.id === ing.id || (ing.name && ing.name.toLowerCase() === v.name.toLowerCase())
                            );

                            if (isMatchedVariation) {
                                console.log(`[Receita: ${recipeData.name}] Substituindo '${ing.name}' por '${groupData.principal.name}'`);

                                // Substituir dados no ingredient da receita
                                ing.ingredient_id = groupData.principal.id;
                                ing.id = groupData.principal.id; // Se a receita usa id
                                ing.name = groupData.renameTo || groupData.principal.name; // Usar o novo nome se renomeado, senao o atual
                                // manter peso, unidade, etc originais da receita (apenas trocando a referência)
                                // idealmente deveríamos puxar os custos/weights base, mas o objetivo é não quebrar a ficha técnica.

                                changed = true;
                            } else if (ing.ingredient_id === groupData.principal.id && groupData.renameTo) {
                                // Caso já usasse o principal, mas o principal mudou de nome
                                if (ing.name !== groupData.renameTo) {
                                    console.log(`[Receita: ${recipeData.name}] Renomeando ingrediente principal de '${ing.name}' para '${groupData.renameTo}'`);
                                    ing.name = groupData.renameTo;
                                    changed = true;
                                }
                            }
                        }
                    });
                }
            });
        }

        if (changed) {
            const ref = db.collection('Recipe').doc(doc.id);
            batch.update(ref, { preparations: recipeData.preparations });
            batchOperations++;
            updatedRecipesCount++;
        }
    });

    console.log(`\nForam encontradas ${updatedRecipesCount} fichas técnicas para atualizar.`);

    // Atualizar nomes dos Principais (se aplicável)
    for (const [principalName, groupData] of Object.entries(mapping)) {
        if (groupData.renameTo) {
            console.log(`[Insumo] Renomeando Insumo ID ${groupData.principal.id} para '${groupData.renameTo}'`);
            const ref = db.collection('Ingredient').doc(groupData.principal.id);
            batch.update(ref, { name: groupData.renameTo });
            batchOperations++;
        }
    }

    // Excluir os duplicados
    console.log(`\nExcluindo ${toDeleteIds.length} insumos duplicados:`);
    for (const [principalName, groupData] of Object.entries(mapping)) {
        for (const v of groupData.variationsFound) {
            console.log(`  - Deletando '${v.name}' (${v.id})`);
            const ref = db.collection('Ingredient').doc(v.id);
            batch.delete(ref);
            batchOperations++;
        }
    }

    // AVISO DE DRY-RUN
    const isDryRun = process.argv.includes('--execute') ? false : true;

    if (isDryRun) {
        console.log(`\n[DRY-RUN] Script executado em modo de simulação. ${batchOperations} operações engatilhadas.`);
        console.log(`Execute com \`node unify_ingredients.cjs --execute\` para aplicar as mudanças!`);
    } else {
        console.log(`\nExecutando alterações no Banco... (${batchOperations} operações)`);
        if (batchOperations > 0) {
            await batch.commit();
            console.log("Alterações realizadas com sucesso!");
        } else {
            console.log("Nenhuma alteração a ser feita.");
        }
    }
}

run().catch(console.error).finally(() => process.exit(0));
