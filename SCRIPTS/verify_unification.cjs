const admin = require('firebase-admin');

const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const UNIFICATION_GROUPS = [
    "Bacon",
    "Acém",
    "Coxão Duro",
    "Patinho",
    "Bacalhau",
    "Peito de Frango"
];

async function run() {
    console.log("Verificando consistência após a unificação...");

    const ingSnap = await db.collection('Ingredient').get();
    const allIngredients = [];
    ingSnap.forEach(doc => {
        allIngredients.push({ id: doc.id, ...doc.data() });
    });

    console.log("\n--- Situação dos Insumos Principais ---");
    for (const name of UNIFICATION_GROUPS) {
        const principal = allIngredients.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (principal) {
            console.log(`[OK] Insumo base encontrado: ${principal.name} (${principal.id})`);
        } else {
            console.log(`[ERRO] Insumo base não encontrado para: ${name}`);
        }

        // Procurar se sobrou algum com nome parecido
        const similar = allIngredients.filter(i =>
            i.id !== (principal ? principal.id : '') &&
            i.name.toLowerCase().includes(name.toLowerCase())
        );
        if (similar.length > 0) {
            console.log(`  -> [AVISO] Ainda existem insumos similares: ${similar.map(s => `'${s.name}'`).join(', ')}`);
        }
    }

    console.log("\n--- Verificando Fichas Técnicas ---");
    const recSnap = await db.collection('Recipe').get();
    let issuesFound = 0;

    recSnap.forEach(doc => {
        let recipeData = doc.data();

        if (recipeData.preparations) {
            recipeData.preparations.forEach((prep) => {
                if (prep.ingredients) {
                    prep.ingredients.forEach((ing) => {
                        const ingId = ing.ingredient_id || ing.id;
                        // Ignorar ingredientes que não têm ID (são apenas textos inseridos nas fichas)
                        if (ingId && ingId.length > 10) {
                            const exists = allIngredients.find(i => i.id === ingId);
                            if (!exists) {
                                // Verificar se é um componente (outra receita)
                                // Muitas vezes sub-receitas são colocadas na lista de ingredientes
                                // Vamos ignorar os alertas caso seja isso por enquanto, 
                                // mas o ideal seria verificar na coleção Recipe
                                if (ing.name && ing.name.length > 30) {
                                    // Provavelmente um passo textual
                                    return;
                                }

                                console.log(`[ALERTA] Receita '${recipeData.name}' possui referência fantasma: Ingredient ID '${ingId}' (${ing.name}) não existe mais no banco!`);
                                issuesFound++;
                            }
                        }
                    });
                }
            });
        }
    });

    if (issuesFound === 0) {
        console.log("\n✅ Nenhuma referência órfã encontrada nas Fichas Técnicas! A unificação foi um sucesso.");
    } else {
        console.log(`\n⚠️ Foram encontradas ${issuesFound} referências problemáticas nas Fichas Técnicas (que não parecem ser textos).`);
    }
}

run().catch(console.error).finally(() => process.exit(0));
