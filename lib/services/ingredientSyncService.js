import { Recipe } from '@/app/api/entities';
import { RecipeEngine } from '@/lib/recipe-engine/RecipeEngine';

/**
 * Sincroniza em cascata os dados de um ingrediente (nome, preço, etc.)
 * para todas as Fichas Técnicas (receitas) que o utilizam, recalculando
 * os custos matemáticos da receita automaticamente.
 * 
 * @param {string} ingredientId - ID original do ingrediente editado
 * @param {object} updatedFields - Objeto com campos atualizados (ex: { name: 'Novo', current_price: 15.50 })
 * @param {string} [oldName] - Nome anterior do ingrediente, usado para fallback de busca em receitas muito antigas sem ID.
 * @returns {number} Quantidade de receitas atualizadas
 */
export async function syncIngredientAcrossRecipes(ingredientId, updatedFields, oldName = null) {
    const diagnosticLogs = [];
    const log = (msg) => {
        console.log(msg);
        diagnosticLogs.push(msg);
    };

    try {
        const allRecipes = await Recipe.list();
        let updatedCount = 0;

        log(`[SyncService] Iniciado para ID: ${ingredientId} | NomeAntigo: ${oldName} | Novos Dados: ${JSON.stringify(updatedFields)}`);

        for (const recipe of allRecipes) {
            if (!recipe.preparations) continue;

            let recipeModified = false;
            const updatedPreparations = recipe.preparations.map((prep, pIndex) => {
                if (!prep.ingredients) return prep;

                const updatedIngredients = prep.ingredients.map((ing, iIndex) => {
                    // Checa se é este ingrediente buscando por todos os campos de ID possíveis
                    const matchById = ing.id === ingredientId ||
                        ing.ingredient_id === ingredientId ||
                        ing.source_ingredient_id === ingredientId;

                    // Fallback brutal: Se a Ficha Técnica for legado e não salvou nenhum ID do ingrediente, buscar pelo nome exato antigo.
                    const matchByName = oldName && (ing.name === oldName || String(ing.name).trim() === String(oldName).trim());

                    if (recipe.name === 'Farofa') {
                        log(`  [SyncService - Trace Farofa] Ingrediente: '${ing.name}' | MatchById: ${matchById} | MatchByName: ${matchByName}`);
                    }

                    if (matchById || matchByName) {
                        recipeModified = true;
                        log(`[SyncService] 🎯 MATCH CONFIRMADO em '${recipe.name}' no ingrediente '${ing.name}'`);

                        // Garantir que a engine leia o novo preço caso tenha alterado
                        const priceUpdate = updatedFields.current_price !== undefined ?
                            { current_price: updatedFields.current_price, price: updatedFields.current_price } : {};

                        return {
                            ...ing,
                            ...updatedFields,
                            ...priceUpdate
                        };
                    }
                    return ing;
                });

                return { ...prep, ingredients: updatedIngredients };
            });

            if (recipeModified) {
                // Recalcular os custos da receita inteira com a Engine oficial
                const metrics = RecipeEngine.calculateRecipeMetrics(recipe, updatedPreparations, allRecipes);

                // Atualizar o banco com os novos cálculos
                await Recipe.update(recipe.id, {
                    preparations: updatedPreparations,
                    total_cost: metrics.total_cost,
                    yield_weight: metrics.yield_weight,
                    total_weight: metrics.total_weight,
                    cost_per_kg_yield: metrics.cost_per_kg_yield,
                    yield_percentage: metrics.yield_percentage,
                    portion_cost: metrics.portion_cost,
                    cuba_cost: metrics.cuba_cost,
                    cuba_weight: metrics.cuba_weight,
                    last_calculated: metrics.last_calculated || new Date().toISOString()
                });

                log(`[Sync] Receita '${recipe.name}' foi atualizada e recalculada com sucesso.`);
                updatedCount++;
            }
        }

        return { updatedCount, logs: diagnosticLogs };
    } catch (error) {
        console.error(`[Sync] Erro crítico ao sincronizar insumo nas receitas:`, error);
        throw error;
    }
}

/**
 * Sincroniza em cascata os dados de uma Receita Matriz (nome, custo, rendimento, etc.)
 * para todas as outras Fichas Técnicas que a utilizam como sub-componente.
 *
 * @param {string} sourceRecipeId - ID da receita matriz que foi alterada
 * @param {object} updatedFields - Dados da receita atualizados (ex: { name: 'Novo Nome', portion_cost: 15.50 })
 * @param {string} [oldName] - Nome anterior para fallback caso o ID não bata perfeitamente
 * @returns {object} { updatedCount, logs }
 */
export async function syncRecipeAcrossRecipes(sourceRecipeId, updatedFields, oldName = null) {
    const diagnosticLogs = [];
    const log = (msg) => {
        console.log(msg);
        diagnosticLogs.push(msg);
    };

    try {
        const allRecipes = await Recipe.list();
        let updatedCount = 0;

        log(`[RecipeSync] Iniciado para Receita Matriz ID: ${sourceRecipeId} | NomeAntigo: ${oldName}`);

        for (const targetRecipe of allRecipes) {
            // Evitar loop infinito: uma receita não atualiza a si mesma aqui
            if (targetRecipe.id === sourceRecipeId) continue;
            if (!targetRecipe.preparations) continue;

            let recipeModified = false;
            let updatedPreparations = JSON.parse(JSON.stringify(targetRecipe.preparations));

            for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
                const prep = updatedPreparations[pIndex];

                const matchRootPrep = prep.origin_id === sourceRecipeId || prep.recipe_id === sourceRecipeId;

                if (targetRecipe.name && targetRecipe.name.toLowerCase().includes('escondidinho')) {
                    log(`[DEBUG ESCONDIDINHO] Validando Etapa do Produto: '${prep.title}'`);
                    log(`   -> prep.origin_id: ${prep.origin_id} | prep.recipe_id: ${prep.recipe_id} | sourceRecipeId (Matriz): ${sourceRecipeId}`);
                    log(`   -> matchRootPrep result: ${matchRootPrep}`);
                }

                if (matchRootPrep) {
                    recipeModified = true;
                    log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Etapa Raiz (Origin ID) '${prep.title}' apontando para a Matriz.`);

                    let allFreshIngredients = [];
                    let mergedProcesses = new Set(prep.processes || []);

                    if (updatedFields.preparations) {
                        updatedFields.preparations.forEach(p => {
                            // Ignore packaging or portioning steps from the base recipe
                            const stepTitle = (p.title || '').toLowerCase();
                            if (stepTitle.includes('embalagem') || stepTitle.includes('porcionamento')) {
                                return; // Skip these steps
                            }

                            if (p.ingredients) {
                                // Tag each ingredient with its source step title for UI grouping
                                const taggedIngredients = p.ingredients.map(ing => ({
                                    ...ing,
                                    _imported_step_title: p.title
                                }));
                                allFreshIngredients = allFreshIngredients.concat(taggedIngredients);
                            }

                            if (p.processes && Array.isArray(p.processes)) {
                                p.processes.forEach(proc => mergedProcesses.add(proc));
                            }
                        });
                    } else if (updatedFields.ingredients && updatedFields.ingredients.length > 0) {
                        // Fallback for flat matrix recipes
                        allFreshIngredients = [...updatedFields.ingredients];
                        if (updatedFields.processes && Array.isArray(updatedFields.processes)) {
                            updatedFields.processes.forEach(proc => mergedProcesses.add(proc));
                        }
                    }

                    if (allFreshIngredients.length > 0) {
                        // NOVO: Precisamos escalar todos esses ingredientes para a porção do produto
                        // Busca a etapa de montagem do próprio produto para descobrir o peso da porção base (peso alvo)
                        const freshYieldWeight = RecipeEngine.parseValue(updatedFields.yield_weight) || 0;
                        let targetWeightInDerived = 0;

                        // Tentar achar em sub_components
                        for (const possibleAssemblyPrep of targetRecipe.preparations) {
                            if (possibleAssemblyPrep.sub_components) {
                                const sc = possibleAssemblyPrep.sub_components.find(s => s.source_id === prep.id);
                                if (sc) {
                                    targetWeightInDerived = RecipeEngine.parseValue(sc.assembly_weight_kg) || RecipeEngine.parseValue(sc.input_yield_weight) || 0;
                                    break;
                                }
                            }
                        }

                        // Se não encontrou no assembly, tentar deduzir comparando um ingrediente comum
                        if (targetWeightInDerived === 0 && prep.ingredients && prep.ingredients.length > 0 && freshYieldWeight > 0) {
                            const currentFirstIng = prep.ingredients[0];
                            const freshMatch = allFreshIngredients.find(i => i.name === currentFirstIng.name);
                            if (freshMatch && RecipeEngine.parseValue(freshMatch.quantity) > 0) {
                                const ratio = RecipeEngine.parseValue(currentFirstIng.quantity) / RecipeEngine.parseValue(freshMatch.quantity);
                                targetWeightInDerived = ratio * freshYieldWeight;
                            }
                        }

                        const scalingFactor = (targetWeightInDerived > 0 && freshYieldWeight > 0)
                            ? (targetWeightInDerived / freshYieldWeight)
                            : 1;

                        prep.ingredients = RecipeEngine.scaleIngredients(allFreshIngredients, scalingFactor);
                        prep.processes = Array.from(mergedProcesses);
                        log(`  [RecipeSync] 🥘 Etapa Raiz '${prep.title}' recebeu ${allFreshIngredients.length} ingredientes agregados da Matriz (Fator: ${scalingFactor.toFixed(4)}).`);
                    }
                }

                // 1. Procurar em sub_components (Usado na Montagem)
                let newSubComponents = prep.sub_components || [];
                if (newSubComponents.length > 0) {
                    for (let sIndex = 0; sIndex < newSubComponents.length; sIndex++) {
                        let sub = newSubComponents[sIndex];
                        // NOVO: 'source_id' de um sub_component em um produto refere-se à Etapa Interna do produto, e NÃO à receita matriz.
                        // Mas para receitas aninhadas (sub_component ligado direto), continua funcionando (id direct match).
                        // Então se a etapa interna DESTE produto foi atualizada acima (matchRootPrep), a array the ingredients da etapa interna está correta.

                        const matchDirectId = sub.id === sourceRecipeId || sub.source_id === sourceRecipeId;
                        const matchByName = oldName && (sub.name === oldName || String(sub.name).trim() === String(oldName).trim());

                        if (targetRecipe.name && targetRecipe.name.toLowerCase().includes('escondidinho')) {
                            log(`[DEBUG ESCONDIDINHO] Validando Sub-componente: '${sub.name}' dentro da etapa '${prep.title}'`);
                            log(`   -> sub.id: ${sub.id} | sub.source_id: ${sub.source_id} | sourceRecipeId: ${sourceRecipeId}`);
                            log(`   -> oldName: ${oldName} | matchDirectId: ${matchDirectId} | matchByName: ${matchByName}`);
                        }

                        if (matchDirectId || matchByName) {
                            recipeModified = true;
                            log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Sub-componente '${sub.name}' (Direto ou Nome)`);

                            let targetWeightInDerived = RecipeEngine.parseValue(sub.assembly_weight_kg) || RecipeEngine.parseValue(sub.input_yield_weight) || 0;
                            const freshYieldWeight = RecipeEngine.parseValue(updatedFields.yield_weight) || 0;

                            let scaledIngredients = sub.ingredients || [];

                            // Lê TODOS os ingredientes de TODAS as etapas preparatórias, ou os ingredientes já mesclados no próprio updatedFields
                            let freshIngredients = [];
                            if (updatedFields.preparations) {
                                updatedFields.preparations.forEach(p => {
                                    const stepTitle = (p.title || '').toLowerCase();
                                    if (!stepTitle.includes('embalagem') && !stepTitle.includes('porcionamento')) {
                                        if (p.ingredients) {
                                            freshIngredients = freshIngredients.concat(p.ingredients);
                                        }
                                    }
                                });
                            } else if (updatedFields.ingredients) {
                                freshIngredients = updatedFields.ingredients;
                            }

                            // Fallback deduction se assembly weight nao existir, mas há array antiga
                            if (targetWeightInDerived === 0 && sub.ingredients && sub.ingredients.length > 0 && freshYieldWeight > 0) {
                                const currentFirstIng = sub.ingredients[0];
                                const freshMatch = freshIngredients.find(i => i.name === currentFirstIng.name);
                                if (freshMatch && RecipeEngine.parseValue(freshMatch.quantity) > 0) {
                                    const ratio = RecipeEngine.parseValue(currentFirstIng.quantity) / RecipeEngine.parseValue(freshMatch.quantity);
                                    targetWeightInDerived = ratio * freshYieldWeight;
                                }
                            }

                            const scalingFactor = (targetWeightInDerived > 0 && freshYieldWeight > 0) ? (targetWeightInDerived / freshYieldWeight) : 1;

                            if (freshIngredients.length > 0) {
                                scaledIngredients = RecipeEngine.scaleIngredients(freshIngredients, scalingFactor);
                                log(`  [RecipeSync] 🥕 Ingredientes recarregados e escalados (Fator: ${scalingFactor.toFixed(4)})`);
                            }

                            sub = {
                                ...sub,
                                name: updatedFields.name || sub.name,
                                unit_price: updatedFields.cost_per_kg_yield !== undefined ? updatedFields.cost_per_kg_yield : (updatedFields.portion_cost || sub.unit_price),
                                category: updatedFields.category || sub.category,
                                input_yield_weight: String(updatedFields.yield_weight || '').replace('.', ','),
                                input_total_cost: String(updatedFields.total_cost || '').replace('.', ','),
                                ingredients: scaledIngredients
                            };
                            newSubComponents[sIndex] = sub;

                            // Substituir também a lista da ETAPA onde essa receita foi gerada na pipeline antiga
                            if (sub.source_id && sub.source_id !== sourceRecipeId) {
                                const sourcePrepIndex = updatedPreparations.findIndex(p => p.id === sub.source_id);
                                if (sourcePrepIndex !== -1 && scaledIngredients.length > 0) {
                                    updatedPreparations[sourcePrepIndex] = {
                                        ...updatedPreparations[sourcePrepIndex],
                                        ingredients: scaledIngredients
                                    };
                                }
                            }
                        } else {
                            // CASCATA LOCAL: Se a etapa interna a qual este componente aponta foi modificada por ser cópia da Matriz
                            const sourcePrepIndex = updatedPreparations.findIndex(p => p.id === sub.source_id);
                            if (sourcePrepIndex !== -1) {
                                const pRef = updatedPreparations[sourcePrepIndex];
                                const isSourcePrepMatrix = pRef.origin_id === sourceRecipeId || pRef.recipe_id === sourceRecipeId;

                                if (isSourcePrepMatrix) {
                                    // A origem DENTRO da receita já foi atualizada na passada do loop (matchRootPrep)!
                                    recipeModified = true;
                                    log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Sub-componente CASCATA '${sub.name}' lendo da etapa '${pRef.title}'`);

                                    sub = {
                                        ...sub,
                                        name: updatedFields.name || sub.name,
                                        unit_price: updatedFields.cost_per_kg_yield !== undefined ? updatedFields.cost_per_kg_yield : (updatedFields.portion_cost || sub.unit_price),
                                        category: updatedFields.category || sub.category,
                                        input_yield_weight: String(updatedFields.yield_weight || '').replace('.', ','),
                                        input_total_cost: String(updatedFields.total_cost || '').replace('.', ','),
                                        // A prep interna base já sofreu o scaling adequado! Basta referenciá-la integralmente.
                                        ingredients: pRef.ingredients || []
                                    };
                                    newSubComponents[sIndex] = sub;
                                }
                            }
                        }
                    }
                }

                // 2. Procurar em recipes array (Maneira Legado ou lista de receitas adicionadas na etapa)
                let newRecipesList = prep.recipes || [];
                if (newRecipesList.length > 0) {
                    for (let rIndex = 0; rIndex < newRecipesList.length; rIndex++) {
                        let rec = newRecipesList[rIndex];
                        const matchById = rec.id === sourceRecipeId || rec.recipe_id === sourceRecipeId;
                        const matchByName = oldName && (rec.name === oldName || String(rec.name).trim() === String(oldName).trim());

                        if (matchById || matchByName) {
                            recipeModified = true;
                            log(`[RecipeSync] 🎯 MATCH em '${targetRecipe.name}' - Receita Inclusa '${rec.name}'`);

                            rec = {
                                ...rec,
                                name: updatedFields.name || rec.name,
                                current_price: updatedFields.cost_per_kg_yield !== undefined ? updatedFields.cost_per_kg_yield : (updatedFields.portion_cost || rec.current_price)
                            };
                            newRecipesList[rIndex] = rec;
                        }
                    }
                }

                prep.sub_components = newSubComponents;
                prep.recipes = newRecipesList;
                updatedPreparations[pIndex] = prep;
            }

            if (recipeModified) {
                // Recalcular os custos da receita alvo com a Engine oficial
                const metrics = RecipeEngine.calculateRecipeMetrics(targetRecipe, updatedPreparations, allRecipes);

                // Atualizar o banco de dados da receita alvo
                await Recipe.update(targetRecipe.id, {
                    preparations: updatedPreparations,
                    total_cost: metrics.total_cost,
                    yield_weight: metrics.yield_weight,
                    total_weight: metrics.total_weight,
                    cost_per_kg_yield: metrics.cost_per_kg_yield,
                    yield_percentage: metrics.yield_percentage,
                    portion_cost: metrics.portion_cost,
                    cuba_cost: metrics.cuba_cost,
                    cuba_weight: metrics.cuba_weight,
                    last_calculated: metrics.last_calculated || new Date().toISOString()
                });

                log(`[RecipeSync] Receita Alvo '${targetRecipe.name}' foi atualizada e recalcula com sucesso.`);
                updatedCount++;
            }
        }

        return { updatedCount, logs: diagnosticLogs };
    } catch (error) {
        console.error(`[RecipeSync] Erro crítico ao sincronizar Receita Matriz:`, error);
        throw error;
    }
}

/**
 * Sincroniza em cascata os dados de um Funcionário (Mão de Obra)
 * para todas as Fichas Técnicas que o utilizam.
 */
export async function syncLaborAcrossRecipes(employeeId, updatedFields) {
    const diagnosticLogs = [];
    const log = (msg) => {
        console.log(msg);
        diagnosticLogs.push(msg);
    };

    try {
        const allRecipes = await Recipe.list();
        let updatedCount = 0;

        const newHourlyRate = updatedFields.salary ? parseFloat(updatedFields.salary) / 220 : null;

        log(`[LaborSync] Iniciado para Funcionario ID: ${employeeId} | Nova Hora Base: ${newHourlyRate}`);

        for (const targetRecipe of allRecipes) {
            if (!targetRecipe.preparations) continue;

            let recipeModified = false;
            let updatedPreparations = JSON.parse(JSON.stringify(targetRecipe.preparations));

            for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
                const prep = updatedPreparations[pIndex];
                let newLaborCosts = prep.labor_costs || [];

                if (newLaborCosts.length > 0) {
                    for (let lIndex = 0; lIndex < newLaborCosts.length; lIndex++) {
                        let labor = newLaborCosts[lIndex];
                        if (labor.employee_id === employeeId || labor.id === employeeId) {
                            recipeModified = true;
                            log(`[LaborSync] 🎯 MATCH em '${targetRecipe.name}' - Funcionario '${labor.name}'`);

                            const durationHours = parseFloat(labor.duration || 0) / 60;
                            const currentHourlyRate = newHourlyRate !== null ? newHourlyRate : parseFloat(labor.cost || 0);
                            const newCalculatedCost = currentHourlyRate * durationHours;

                            labor = {
                                ...labor,
                                name: updatedFields.name || labor.name,
                                role: updatedFields.role || labor.role,
                                cost: currentHourlyRate, // Base hourly rate
                                calculatedCost: newCalculatedCost
                            };
                            newLaborCosts[lIndex] = labor;
                        }
                    }
                    prep.labor_costs = newLaborCosts;
                }
                updatedPreparations[pIndex] = prep;
            }

            if (recipeModified) {
                // Reconstruir o operational_cost
                let totalOpCost = 0;
                updatedPreparations.forEach(p => {
                    if (p.equipment_costs) {
                        totalOpCost += p.equipment_costs.reduce((sum, eq) => sum + (parseFloat(eq.calculatedCost) || parseFloat(eq.cost) || 0), 0);
                    }
                    if (p.labor_costs) {
                        totalOpCost += p.labor_costs.reduce((sum, lb) => sum + (parseFloat(lb.calculatedCost) || 0), 0);
                    }
                });

                const metrics = RecipeEngine.calculateRecipeMetrics(targetRecipe, updatedPreparations, allRecipes);
                const finalRecipeData = {
                    ...targetRecipe,
                    preparations: updatedPreparations,
                    total_cost: metrics.total_cost,
                    yield_weight: metrics.yield_weight,
                    total_weight: metrics.total_weight,
                    cost_per_kg_yield: metrics.cost_per_kg_yield,
                    yield_percentage: metrics.yield_percentage,
                    portion_cost: metrics.portion_cost,
                    cuba_cost: metrics.cuba_cost,
                    cuba_weight: metrics.cuba_weight,
                    operational_cost: totalOpCost,
                    last_calculated: metrics.last_calculated || new Date().toISOString()
                };

                await Recipe.update(targetRecipe.id, {
                    preparations: finalRecipeData.preparations,
                    total_cost: finalRecipeData.total_cost,
                    yield_weight: finalRecipeData.yield_weight,
                    total_weight: finalRecipeData.total_weight,
                    cost_per_kg_yield: finalRecipeData.cost_per_kg_yield,
                    yield_percentage: finalRecipeData.yield_percentage,
                    portion_cost: finalRecipeData.portion_cost,
                    cuba_cost: finalRecipeData.cuba_cost,
                    cuba_weight: finalRecipeData.cuba_weight,
                    operational_cost: finalRecipeData.operational_cost,
                    last_calculated: finalRecipeData.last_calculated
                });

                log(`[LaborSync] Receita Alvo '${targetRecipe.name}' atualizada com sucesso.`);
                updatedCount++;

                // Dispara sincronização em cascata se esta receita for usada como sub-receita
                await syncRecipeAcrossRecipes(targetRecipe.id, finalRecipeData, targetRecipe.name);
            }
        }

        return { updatedCount, logs: diagnosticLogs };
    } catch (error) {
        console.error(`[LaborSync] Erro crítico ao sincronizar Mao de Obra:`, error);
        throw error;
    }
}

/**
 * Sincroniza em cascata os dados de um Equipamento (POP)
 * para todas as Fichas Técnicas que o utilizam.
 */
export async function syncEquipmentAcrossRecipes(equipmentId, updatedFields) {
    const diagnosticLogs = [];
    const log = (msg) => {
        console.log(msg);
        diagnosticLogs.push(msg);
    };

    try {
        const allRecipes = await Recipe.list();
        let updatedCount = 0;

        const newHourlyRate = updatedFields.custoOperacional ? parseFloat(updatedFields.custoOperacional) : null;

        log(`[EquipmentSync] Iniciado para Equipamento ID: ${equipmentId} | Nova Hora Base: ${newHourlyRate}`);

        for (const targetRecipe of allRecipes) {
            if (!targetRecipe.preparations) continue;

            let recipeModified = false;
            let updatedPreparations = JSON.parse(JSON.stringify(targetRecipe.preparations));

            for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
                const prep = updatedPreparations[pIndex];
                let newEqCosts = prep.equipment_costs || [];

                if (newEqCosts.length > 0) {
                    for (let eIndex = 0; eIndex < newEqCosts.length; eIndex++) {
                        let eq = newEqCosts[eIndex];
                        if (eq.pop_id === equipmentId || eq.id === equipmentId) {
                            recipeModified = true;
                            log(`[EquipmentSync] 🎯 MATCH em '${targetRecipe.name}' - Equipamento '${eq.name}'`);

                            const durationHours = parseFloat(eq.duration || 0) / 60;
                            const ratio = parseFloat(eq.ratio !== undefined ? eq.ratio : 1);

                            const currentHourlyRate = newHourlyRate !== null ? newHourlyRate : (parseFloat(eq.calculatedCost || eq.cost || 0) / durationHours / ratio) || 0;

                            const newCalculatedCost = (currentHourlyRate * durationHours) * ratio;

                            eq = {
                                ...eq,
                                name: updatedFields.nome || eq.name,
                                calculatedCost: newCalculatedCost, // Note: we store it here
                                cost: newCalculatedCost // Fallback to existing logic in UI
                            };
                            newEqCosts[eIndex] = eq;
                        }
                    }
                    prep.equipment_costs = newEqCosts;
                }
                updatedPreparations[pIndex] = prep;
            }

            if (recipeModified) {
                // Reconstruir o operational_cost
                let totalOpCost = 0;
                updatedPreparations.forEach(p => {
                    if (p.equipment_costs) {
                        totalOpCost += p.equipment_costs.reduce((sum, eq) => sum + (parseFloat(eq.calculatedCost) || parseFloat(eq.cost) || 0), 0);
                    }
                    if (p.labor_costs) {
                        totalOpCost += p.labor_costs.reduce((sum, lb) => sum + (parseFloat(lb.calculatedCost) || parseFloat(lb.cost) || 0), 0);
                    }
                });

                const metrics = RecipeEngine.calculateRecipeMetrics(targetRecipe, updatedPreparations, allRecipes);
                const finalRecipeData = {
                    ...targetRecipe,
                    preparations: updatedPreparations,
                    total_cost: metrics.total_cost,
                    yield_weight: metrics.yield_weight,
                    total_weight: metrics.total_weight,
                    cost_per_kg_yield: metrics.cost_per_kg_yield,
                    yield_percentage: metrics.yield_percentage,
                    portion_cost: metrics.portion_cost,
                    cuba_cost: metrics.cuba_cost,
                    cuba_weight: metrics.cuba_weight,
                    operational_cost: totalOpCost,
                    last_calculated: metrics.last_calculated || new Date().toISOString()
                };

                await Recipe.update(targetRecipe.id, {
                    preparations: finalRecipeData.preparations,
                    total_cost: finalRecipeData.total_cost,
                    yield_weight: finalRecipeData.yield_weight,
                    total_weight: finalRecipeData.total_weight,
                    cost_per_kg_yield: finalRecipeData.cost_per_kg_yield,
                    yield_percentage: finalRecipeData.yield_percentage,
                    portion_cost: finalRecipeData.portion_cost,
                    cuba_cost: finalRecipeData.cuba_cost,
                    cuba_weight: finalRecipeData.cuba_weight,
                    operational_cost: finalRecipeData.operational_cost,
                    last_calculated: finalRecipeData.last_calculated
                });

                log(`[EquipmentSync] Receita Alvo '${targetRecipe.name}' atualizada com sucesso.`);
                updatedCount++;

                // Dispara sincronização em cascata se esta receita for usada como sub-receita
                await syncRecipeAcrossRecipes(targetRecipe.id, finalRecipeData, targetRecipe.name);
            }
        }
        return { updatedCount, logs: diagnosticLogs };
    } catch (error) {
        console.error(`[EquipmentSync] Erro crítico ao sincronizar Equipamentos:`, error);
        throw error;
    }
}
