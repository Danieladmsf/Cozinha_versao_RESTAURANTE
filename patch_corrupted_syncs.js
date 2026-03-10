import { db } from './lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from './lib/recipe-engine/RecipeEngine.js';
import fs from 'fs';

async function fixCorruptedProducts() {
    console.log("Baixando receitas...");
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipes = new Map();
    const recipesArr = [];

    snap.forEach(d => {
        const data = { id: d.id, ...d.data() };
        recipes.set(d.id, data);
        recipesArr.push(data);
    });

    console.log("Localizando a verdadeira Matriz do Arroz Branco...");
    const matrizArroz = recipesArr.find(r => r.name === 'Arroz Branco' && r.type === 'receitas');
    if (!matrizArroz) {
        console.error("Matriz Arroz Branco não encontrada!");
        return;
    }
    console.log(`Matriz Arroz: ${matrizArroz.id}`);

    // Dicionário de Correção Máxima
    const correctionMap = {
        // Rotisserie Arroz Branco -> Matriz Arroz Branco
        '3pTB0f29hUIp66jBXI0G': matrizArroz.id,

        // Escondidinhos
        'rec_aIXPh3rOFfABBbpiOSMM_1772574279426': recipesArr.find(r => r.name === 'Escondidinho de Carne Seca' && r.type === 'receitas')?.id,
        'rec_kffd1wUv9S5dkHtoAjuR_1772574282158': recipesArr.find(r => r.name === 'Escondidinho de Frango' && r.type === 'receitas')?.id,

        // Maionese
        'rec_rygiSjjNkPs7xpMNNwiS_1772574285233': recipesArr.find(r => r.name === 'Maionese de Legumes com Frango' && r.type === 'receitas')?.id
    };

    let fixedCount = 0;

    for (const [id, recipe] of recipes) {
        if (recipe.type !== 'produtos') continue;

        if (!recipe.preparations) continue;

        let needsUpdate = false;
        const newPreparations = [...recipe.preparations];

        newPreparations.forEach((prep, pIdx) => {
            if (prep.origin_id && correctionMap[prep.origin_id]) {
                const correctOriginId = correctionMap[prep.origin_id];
                if (correctOriginId) {
                    console.log(`Corrigindo ${recipe.name}...`);
                    console.log(`  -> Alterando origin_id da Etapa ${pIdx + 1} de [${prep.origin_id}] para Matriz Real [${correctOriginId}]`);

                    // CORRIGIR origin_id
                    newPreparations[pIdx].origin_id = correctOriginId;

                    // CORRIGIR ingredientes (Eles estão achatados, vamos forçar os ingredientes reais da matriz original)
                    const trueMatriz = recipes.get(correctOriginId);

                    // Isso não vai reparar instantaneamente os dados achatados (que é impossível sem um engine completo de importação)
                    // MAS vai religar o origin_id!
                    // O Próximo "Sincronizar" na receita vai varrer e consertar o resto

                    needsUpdate = true;
                }
            }
        });

        if (needsUpdate) {
            console.log(`Salvando correção em: ${recipe.id}`);
            await updateDoc(doc(db, 'Recipe', recipe.id), {
                preparations: newPreparations
            });
            fixedCount++;
        }
    }

    console.log(`\nConcluído! ${fixedCount} produtos tiveram o elo restaurado com a Matriz verdadeira.`);
    console.log("AGORA: Por favor, vá na Matriz 'Escondidinho de Carne Seca' ou 'Arroz Branco', edite qualquer coisa (ex: delete e recrie algo) e clique 'Salvar e Sincronizar'.");
}

fixCorruptedProducts().then(() => process.exit(0)).catch(console.error);
