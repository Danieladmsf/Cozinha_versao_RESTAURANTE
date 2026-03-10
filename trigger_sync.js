import { db } from './lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { RecipeEngine } from './lib/recipe-engine/RecipeEngine.js';
import fs from 'fs';

function parseNumberFallback(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const parsed = parseFloat(String(val).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
}

function scaleIngredients(ingredients, factor) {
    return ingredients.map(ing => ({
        ...ing,
        amount: String(parseNumberFallback(ing.amount) * factor),
        quantity: parseNumberFallback(ing.quantity) * factor,
        cost: parseNumberFallback(ing.cost) * factor,
    }));
}

// ----------------------------------------------------
// CÓPIA DIRETA DA ENGINE DE SINCRONISMO PARA IGNORAR ALIAS DO NEXT.JS
// ----------------------------------------------------
async function logError(sourceId, targetId, errorMsg, originalError) {
    try {
        console.error(`[IngredientSyncService - ERROR] Sincronização falhou. Matriz: ${sourceId} | Produto: ${targetId}`);
        console.error(`Detalhes: ${errorMsg}`);
        console.error(originalError);
    } catch (e) {
        console.error("Falha ao registrar log de erro de sincronismo", e);
    }
}

async function syncRecipeAcrossRecipes(sourceRecipeId, sourceRecipeData) {
    console.log(`[RecipeSync] ==== INICIANDO SINCRONIZAÇÃO EM LOTE ====`);
    console.log(`[RecipeSync] Receita Matriz de Origem: '${sourceRecipeData.name}' (ID: ${sourceRecipeId})`);

    try {
        const snap = await getDocs(collection(db, 'Recipe'));
        const allRecipes = [];
        snap.forEach(d => allRecipes.push({ id: d.id, ...d.data() }));

        let updatedCount = 0;
        let errorsCount = 0;

        for (const targetRecipe of allRecipes) {
            if (targetRecipe.id === sourceRecipeId) continue;

            let recipeModified = false;
            let updatedPreparations = targetRecipe.preparations ? JSON.parse(JSON.stringify(targetRecipe.preparations)) : [];

            for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
                const prep = updatedPreparations[pIndex];
                const matchRootPrep = prep.origin_id === sourceRecipeId || prep.recipe_id === sourceRecipeId;

                if (matchRootPrep) {
                    recipeModified = true;
                    console.log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Etapa Raiz (Origin ID) '${prep.title}' apontando para a Matriz.`);

                    const packagingProcess = prep.processes?.includes('packaging');
                    if (packagingProcess) continue;

                    let totalRawWeightKg = typeof sourceRecipeData.total_weight === 'number' ? sourceRecipeData.total_weight :
                        parseFloat(String(sourceRecipeData.total_weight || '0').replace(',', '.'));

                    let targetWeightKg = parseFloat(String(prep.total_yield_weight_prep || '1').replace(',', '.'));
                    let scalingFactor = 1;

                    if (totalRawWeightKg > 0) {
                        scalingFactor = targetWeightKg / totalRawWeightKg;
                        console.log(`[RecipeSync] ⚖️  (Etapa Raiz) Calculando Escala via Peso Bruto da Matriz: Alvo (${targetWeightKg}kg) / Matriz (${totalRawWeightKg}kg) = Fator ${scalingFactor.toFixed(4)}`);
                    } else {
                        // Fallback pro yield real
                        let totalYieldKg = typeof sourceRecipeData.yield_weight === 'number' ? sourceRecipeData.yield_weight :
                            parseFloat(String(sourceRecipeData.yield_weight || '0').replace(',', '.'));
                        if (totalYieldKg > 0) {
                            scalingFactor = targetWeightKg / totalYieldKg;
                            console.log(`[RecipeSync] ⚖️  (Etapa Raiz) Calculando Escala via Peso Líquido da Matriz: Alvo (${targetWeightKg}kg) / Matriz Líq (${totalYieldKg}kg) = Fator ${scalingFactor.toFixed(4)}`);
                        } else {
                            console.log(`[RecipeSync] ⚠️  (Etapa Raiz) Matriz '${sourceRecipeData.name}' não possui pesos definidos (Bruto=0, Líq=0). Fator de Escala mantido em 1.0`);
                        }
                    }

                    const scaledIngredients = scaleIngredients(sourceRecipeData.ingredients || [], scalingFactor);
                    prep.ingredients = scaledIngredients;

                    try {
                        let baseYieldForCost = sourceRecipeData.yield_weight;
                        if (!baseYieldForCost || baseYieldForCost <= 0) {
                            baseYieldForCost = sourceRecipeData.total_weight;
                        }
                        // Sem metrics para não depender do RecipeEngine inteiro
                        prep.total_cost_prep = metrics.totalCost;
                    } catch (metricError) {
                        console.log(`[RecipeSync] ⚠️ Erro logico ao calcular metricas na raiz (Avançando ignorando custo da etapa raiz) `, metricError);
                    }
                }

                let newSubComponents = prep.sub_components || [];
                if (newSubComponents.length > 0) {
                    for (let sIndex = 0; sIndex < newSubComponents.length; sIndex++) {
                        let sub = newSubComponents[sIndex];
                        const oldName = typeof sub.title === 'string' ? sub.title : (typeof sub.name === 'string' ? sub.name : null);

                        const matchDirectId = sub.id === sourceRecipeId || sub.source_id === sourceRecipeId;
                        const matchByName = oldName && (sub.name === oldName || String(sub.name).trim() === String(oldName).trim());

                        if (matchDirectId || matchByName) {
                            recipeModified = true;
                            console.log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Sub-componente '${sub.name}' (Direto ou Nome)`);

                            let internalRecipeMatch = null;
                            const possibleSourceId = sub.source_id || sub.id;

                            if (possibleSourceId !== sourceRecipeId) {
                                internalRecipeMatch = updatedPreparations.find(p => p.id === possibleSourceId);
                            }

                            if (internalRecipeMatch) {
                                console.log(`[RecipeSync] 🔄 Cascading update: Atualizando Sub-componente clonando Etapa Raiz interna (${internalRecipeMatch.title})`);
                                sub.total_cost = internalRecipeMatch.total_cost_prep || internalRecipeMatch.total_cost || 0;
                            } else {
                                console.log(`[RecipeSync] ⚡ Aplicando ingredientes diretos no Sub-componente (Escalonando...)`);
                                let targetWeightInDerived = parseNumberFallback(sub.assembly_weight_kg) || parseNumberFallback(sub.quantity) || parseNumberFallback(sub.amount);
                                let scalingFactor = 1;

                                if (!targetWeightInDerived || targetWeightInDerived <= 0) {
                                    // Fator Deduzido com fallback para produtos antigos sem peso gravado!
                                    console.log(`[RecipeSync] ⚠️ (Legacy) Sub-componente sem 'assembly_weight_kg'. Tentando deduzir fator pelo rendimento total do target...`);
                                    let estimatedKg = parseFloat(String(prep.total_yield_weight_prep || targetRecipe.yield_weight || targetRecipe.cuba_weight || '1').replace(',', '.'));
                                    let originalRawKg = parseFloat(String(sourceRecipeData.total_weight || '1').replace(',', '.'));
                                    scalingFactor = originalRawKg > 0 ? (estimatedKg / originalRawKg) : 1;

                                    targetWeightInDerived = originalRawKg * scalingFactor;
                                    console.log(`[RecipeSync] 🔮 (Legacy) Fator deduzido como: ${scalingFactor.toFixed(4)}. Aplicando novo peso da montagem: ${targetWeightInDerived.toFixed(4)}kg`);
                                    sub.assembly_weight_kg = targetWeightInDerived;
                                } else {
                                    let totalYieldWeightKg = parseNumberFallback(sourceRecipeData.yield_weight);
                                    if (totalYieldWeightKg <= 0) {
                                        totalYieldWeightKg = parseNumberFallback(sourceRecipeData.total_weight);
                                    }

                                    if (totalYieldWeightKg > 0) {
                                        scalingFactor = targetWeightInDerived / totalYieldWeightKg;
                                        console.log(`[RecipeSync] ⚖️  (Sub-componente) Escala: Alvo Montagem (${targetWeightInDerived}kg) / Matriz ${totalYieldWeightKg}kg = Fator ${scalingFactor.toFixed(4)}`);
                                    } else {
                                        console.log(`[RecipeSync] ⚠️  (Sub-componente) Matriz sem peso. Fator: 1.0`);
                                    }
                                }

                                if (sourceRecipeData.ingredients && sourceRecipeData.ingredients.length > 0) {
                                    const scaledSubIngredients = scaleIngredients(sourceRecipeData.ingredients, scalingFactor);

                                    try {
                                        // Sem metrics para simplificar o script
                                        sub.total_cost = metrics.totalCost;
                                    } catch (metricError) {
                                        console.log(`[RecipeSync] ⚠️ Erro logico ao calcular metricas no sub-componente.`, metricError);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (recipeModified) {
                console.log(`[RecipeSync] ✔️ Salvando produto afetado '${targetRecipe.name}' (${targetRecipe.id})`);
                try {
                    await updateDoc(doc(db, 'Recipe', targetRecipe.id), { preparations: updatedPreparations });
                    updatedCount++;
                } catch (saveError) {
                    errorsCount++;
                    await logError(sourceRecipeId, targetRecipe.id, "Erro ao salvar o documento de destino no Firestore", saveError);
                }
            }
        }

        console.log(`[RecipeSync] ==== SINCRONIZAÇÃO EM LOTE FINALIZADA ====`);
        console.log(`[RecipeSync] Resumo: ${updatedCount} produtos atualizados com sucesso. ${errorsCount} erros.`);

        return { success: true, updatedCount, errorsCount };
    } catch (error) {
        console.error(`[RecipeSync] ❌ ERRO FATAL no processo de sincronização para a matriz ${sourceRecipeId}:`, error);
        await logError(sourceRecipeId, 'MULTIPLE', "Erro crítico que abortou a cascata inteira", error);
        return { success: false, error: error.message };
    }
}
// ----------------------------------------------------

async function forceSyncAllCorrupted() {
    console.log("Baixando dicionário de Receitas do Banco...");
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipesArr = [];
    snap.forEach(d => recipesArr.push({ id: d.id, ...d.data() }));

    const baseRecipesNames = [
        'Arroz Branco',
        'Escondidinho de Carne Seca',
        'Escondidinho de Frango',
        'Maionese de Legumes com Frango'
    ];

    console.log(`\nIniciando Processo de Sincronismo Lote...`);
    let totalSynced = 0;

    for (const recipeName of baseRecipesNames) {
        const matriz = recipesArr.find(r => r.name === recipeName && r.type === 'receitas');
        if (!matriz) {
            console.error(`Matriz '${recipeName}' não encontrada! Pulando...`);
            continue;
        }

        console.log(`\n=================================================`);
        console.log(`Sincronizando produtos dependentes de: ${matriz.name}`);
        console.log(`=================================================`);

        try {
            await syncRecipeAcrossRecipes(matriz.id, matriz);
            totalSynced++;
        } catch (err) {
            console.error(`❌ Erro ao sincronizar ${matriz.name}:`, err);
        }
    }

    console.log(`\n====================== FIM ======================`);
    console.log(`Todas as ${totalSynced} matrizes foram reprocessadas e atualizaram seus produtos filhos.`);
}

forceSyncAllCorrupted().then(() => process.exit(0)).catch(console.error);
