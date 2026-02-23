import { useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui";
import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";

/**
 * Hook para gerenciar lógicas complexas de Sincronização e Atualização Massiva
 * (Receitas Matriz, Ingredientes Externos e Cascatas de Sincronização).
 */
export function useRecipeSync({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    parseNumericValue
}) {
    const { toast } = useToast();

    // Função de Sincronização
    const handleSyncPreparation = useCallback(async (prepIndex) => {
        const prep = preparationsData[prepIndex];
        if (!prep) return;

        // Identificar IDs únicos de receitas fonte (nova estrutura)
        const sourceIds = [...new Set([
            prep.source_recipe_id, // ID na preparação
            ...(prep.ingredients?.map(i => i.source_recipe_id).filter(Boolean) || [])
        ].filter(Boolean))];



        if (sourceIds.length === 0) {
            toast({ title: "Nada para sincronizar", description: "Esta etapa não possui vínculo com receita base." });
            return;
        }

        try {
            toast({ title: "Sincronizando...", description: "Buscando atualizações da receita base." });

            // Buscar receitas fonte atualizadas
            const sourceRecipes = {};
            for (const id of sourceIds) {
                const docRef = doc(db, "Recipe", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    sourceRecipes[id] = { id: docSnap.id, ...docSnap.data() };

                }
            }

            if (Object.keys(sourceRecipes).length === 0) {
                toast({ title: "Erro", description: "Receita base não encontrada.", variant: "destructive" });
                return;
            }

            // Construir mapa de ingredientes da fonte para lookup
            // Chave: ingredient_id (ID base do insumo, não o ID único da instância)
            const sourceIngredientMap = new Map();
            for (const recipe of Object.values(sourceRecipes)) {
                (recipe.preparations || []).forEach(p => {
                    (p.ingredients || []).forEach(ing => {
                        // Usar ingredient_id como chave primária (fallback para id)
                        const key = ing.ingredient_id || ing.id;
                        if (key) {
                            sourceIngredientMap.set(key, {
                                ...ing,
                                _sourceRecipeId: recipe.id,
                                _sourceRecipeName: recipe.name
                            });
                        }
                    });
                });
            }

            // Atualizar ingredientes existentes mantendo estrutura
            const updatedIngredients = (prep.ingredients || []).map(ing => {
                // Se tem source_ingredient_id, buscar atualização
                if (ing.source_ingredient_id) {
                    const sourceIng = sourceIngredientMap.get(ing.source_ingredient_id);
                    if (sourceIng) {
                        const parseNum = (val) => {
                            if (val === undefined || val === null) return 0;
                            return parseFloat(String(val).replace(',', '.')) || 0;
                        };

                        // Calcular proporções do pai
                        const parentRaw = parseNum(sourceIng.weight_raw);
                        const parentClean = parseNum(sourceIng.weight_clean) || parentRaw;
                        const parentPreCook = parseNum(sourceIng.weight_pre_cooking) || parentClean;
                        const parentCooked = parseNum(sourceIng.weight_cooked) || parentPreCook;

                        const childRaw = parseNum(ing.weight_raw);

                        // Aplicar proporções
                        const cleanRatio = parentRaw > 0 ? parentClean / parentRaw : 1;
                        const preCookRatio = parentClean > 0 ? parentPreCook / parentClean : 1;
                        const cookRatio = parentPreCook > 0 ? parentCooked / parentPreCook : 1;

                        const newCleanVal = childRaw * cleanRatio;
                        const newPreCookVal = newCleanVal * preCookRatio;

                        const newClean = newCleanVal.toFixed(3);
                        const newPreCook = newPreCookVal.toFixed(3);
                        const newCooked = (newPreCookVal * cookRatio).toFixed(3);

                        return {
                            ...ing,
                            // Atualizar campos de custo
                            price: sourceIng.price,
                            cost_clean: sourceIng.cost_clean,
                            // Atualizar pesos com proporções
                            weight_clean: newClean,
                            weight_pre_cooking: newPreCook,
                            weight_cooked: newCooked,
                            // Manter rastreamento
                            source_recipe_id: sourceIng._sourceRecipeId,
                            source_recipe_name: sourceIng._sourceRecipeName
                        };
                    }
                }
                // Ingrediente manual ou sem link - manter como está
                return ing;
            });

            // Atualizar state
            setPreparationsData(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                    newData[prepIndex] = {
                        ...newData[prepIndex],
                        ingredients: updatedIngredients
                    };
                }
                return newData;
            });

            setIsDirty(true);
            toast({
                title: "Sincronizado!",
                description: `${updatedIngredients.length} ingredientes atualizados.`,
                className: "bg-green-100 border-green-500"
            });

        } catch (error) {
            console.error("[SYNC] Error:", error);
            toast({ title: "Erro", description: "Falha ao sincronizar receita.", variant: "destructive" });
        }

    }, [preparationsData, setPreparationsData, setIsDirty, toast]);

    // Função para obter dados atualizados dos ingredientes (preços e dados técnicos)
    // Retorna os novos dados de preparação para serem usados no salvamento
    const getRefreshedPreparations = useCallback(async () => {

        try {
            // Buscar TODOS os ingredientes ativos do banco
            const q = query(collection(db, "Ingredient"), where("active", "!=", false));
            const querySnapshot = await getDocs(q);


            const ingredientsMap = new Map();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Indexar por ID e também por NOME para facilitar o match
                ingredientsMap.set(doc.id, { id: doc.id, ...data });
            });

            let updatedCount = 0;

            // Percorrer preparações e atualizar
            const newPreparations = preparationsData.map(prep => ({
                ...prep,
                ingredients: (prep.ingredients || []).map(ing => {


                    // Tentar encontrar pelo nome exato no mapa
                    const originalIng = Array.from(ingredientsMap.values()).find(i => i.name === ing.name);

                    if (originalIng) {


                        const tech = originalIng.technical_data || {};

                        // Lógica de Recálculo de Pesos (Enforce Standards)
                        const parseVal = (v) => {
                            if (!v) return 0;
                            return parseFloat(String(v).replace(',', '.'));
                        };

                        const formatVal = (v) => {
                            return String(v.toFixed(3)).replace('.', ',');
                        };

                        let newWeights = {};

                        // 1. Descongelamento (Frozen -> Thawed)
                        const weightFrozen = parseVal(ing.weight_frozen);
                        if (weightFrozen > 0 && tech.thawing_loss_pct) {
                            const loss = parseVal(tech.thawing_loss_pct);
                            const val = weightFrozen * (1 - loss / 100);
                            newWeights.weight_thawed = formatVal(val);
                        }

                        // 2. Limpeza (Thawed/Raw -> Clean)
                        const inputClean = newWeights.weight_thawed ? parseVal(newWeights.weight_thawed) : (parseVal(ing.weight_thawed) || parseVal(ing.weight_raw));

                        if (inputClean > 0 && tech.cleaning_loss_pct) {
                            const loss = parseVal(tech.cleaning_loss_pct);
                            const val = inputClean * (1 - loss / 100);
                            newWeights.weight_clean = formatVal(val);
                        }

                        // 3. Cocção (Clean/Raw -> Cooked)
                        const inputCook = newWeights.weight_clean ? parseVal(newWeights.weight_clean) : (parseVal(ing.weight_clean) || parseVal(ing.weight_raw));

                        if (inputCook > 0 && tech.cooking_loss_pct) {
                            const loss = parseVal(tech.cooking_loss_pct);
                            const val = inputCook * (1 - loss / 100);
                            newWeights.weight_cooked = formatVal(val);
                        }

                        updatedCount++;
                        return {
                            ...ing,
                            // Atualizar preços
                            current_price: originalIng.current_price,
                            unit: originalIng.unit,

                            // Atualizar dados técnicos (perdas)
                            technical_data: {
                                ...tech,
                                cleaning_time_min: tech.cleaning_time_min,
                                thawing_loss_pct: tech.thawing_loss_pct,
                                cleaning_loss_pct: tech.cleaning_loss_pct,
                                cooking_loss_pct: tech.cooking_loss_pct,
                                labor_role_id: tech.labor_role_id
                            },

                            // Aplicar novos pesos recalculados (se gerados)
                            ...newWeights
                        };
                    }
                    return ing;
                })
            }));


            return newPreparations;

        } catch (err) {
            console.error("Erro ao atualizar ingredientes:", err);
            toast({ title: "Aviso", description: "Erro na sincronização. Verifique o console.", variant: "warning" });
            return preparationsData;
        }
    }, [preparationsData, toast]);

    // HELPER DE ATUALIZAÇÂO DE MATRIZ
    const refreshMatrixRecipes = useCallback(async (preparations) => {
        let updatedPreparations = JSON.parse(JSON.stringify(preparations));
        let hasUpdates = false;

        // Iterar sobre todas as preparações
        for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
            const prep = updatedPreparations[pIndex];

            // Verificar se há sub-componentes que são receitas importadas (Matriz)
            if (prep.sub_components && prep.sub_components.length > 0) {

                for (let sIndex = 0; sIndex < prep.sub_components.length; sIndex++) {
                    const subComp = prep.sub_components[sIndex];

                    // Se tiver origin_id, significa que é uma receita importada E vinculada
                    const sourcePrep = updatedPreparations.find(p => p.id === subComp.source_id);
                    const originId = subComp.origin_id || (sourcePrep && sourcePrep.origin_id);
                    if (originId) {
                        try {                            // Buscar dados frescos da receita original
                            const recipeRef = doc(db, 'Recipe', originId);
                            const recipeSnap = await getDoc(recipeRef);

                            if (recipeSnap.exists()) {
                                const freshRecipeData = recipeSnap.data();

                                // Calcular peso ALVO atual nesta preparação
                                const targetWeightInDerived = parseNumericValue(subComp.assembly_weight_kg) || parseNumericValue(subComp.input_yield_weight) || 0;

                                // Peso original da receita fresca, calculado usando o motor oficial
                                const matrixMetrics = RecipeCalculator.calculateRecipeMetrics(
                                    freshRecipeData.preparations || [],
                                    freshRecipeData
                                );
                                const freshYieldWeight = matrixMetrics.yield_weight || parseNumericValue(freshRecipeData.yield_weight) || 0;                                // Escalar apenas se tivermos pesos válidos
                                if (targetWeightInDerived > 0 && freshYieldWeight > 0) {
                                    const scalingFactor = targetWeightInDerived / freshYieldWeight;                                    // Atualizar valores do sub-componente
                                    let scaledIngredients = [];
                                    const freshIngredients = (freshRecipeData.ingredients && freshRecipeData.ingredients.length > 0)
                                        ? freshRecipeData.ingredients
                                        : ((freshRecipeData.preparations || [])[0] || {}).ingredients || [];
                                    if (freshIngredients.length > 0) {
                                        scaledIngredients = RecipeCalculator.scaleIngredients(freshIngredients, scalingFactor);
                                    }

                                    prep.sub_components[sIndex] = {
                                        ...subComp,
                                        input_yield_weight: String(freshRecipeData.yield_weight).replace('.', ','),
                                        input_total_cost: String(freshRecipeData.total_cost).replace('.', ','),
                                        assembly_weight_kg: subComp.assembly_weight_kg,
                                        ingredients: scaledIngredients
                                    }; hasUpdates = true;

                                    const sourcePrepIndex = updatedPreparations.findIndex(p => p.id === subComp.source_id);
                                    if (sourcePrepIndex !== -1 && scaledIngredients.length > 0) {
                                        updatedPreparations[sourcePrepIndex] = {
                                            ...updatedPreparations[sourcePrepIndex],
                                            ingredients: scaledIngredients
                                        };
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(`❌ [MATRIX] Erro ao buscar receita ${subComp.name}:`, error);
                        }
                    }
                }
            }
        }

        return { updatedPreparations, hasUpdates };
    }, [parseNumericValue]);

    return {
        handleSyncPreparation,
        getRefreshedPreparations,
        refreshMatrixRecipes
    };
}
