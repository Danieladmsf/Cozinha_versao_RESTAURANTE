import { useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { RecipeCalculator, parseNumber } from '@/lib/recipeCalculator';

/**
 * TASK TYPES:
 * - rendimento:     Cozinheira cozinha no dia (arroz, feijão, macarrão, proteínas)
 * - pre_preparo:    Auxiliar faz no dia anterior (dessalgar, temperar, marinar)
 * - processamento:  Auxiliar faz no dia, antes de cozinhar (picar, descascar, cortar)
 * - sem_categoria:  Itens sem definição (para não sumirem da conta)
 */

export const TASK_TYPES = {
    rendimento: {
        id: 'rendimento',
        label: 'Tabela de Rendimento',
        shortLabel: 'Rendimento',
        role: 'Cozinheira',
        when: 'No dia',
        bgClass: 'bg-stone-50',
        borderClass: 'border-stone-300',
        textClass: 'text-stone-700',
        badgeClass: 'bg-stone-100 text-stone-700',
        headerClass: 'bg-stone-100',
        categoryBg: 'bg-stone-200/60',
        recipeBg: 'bg-stone-50',
    },
    pre_preparo: {
        id: 'pre_preparo',
        label: 'Pré-preparo',
        shortLabel: 'Pré-prep',
        role: 'Auxiliar',
        when: 'Dia anterior',
        bgClass: 'bg-slate-50',
        borderClass: 'border-slate-300',
        textClass: 'text-slate-700',
        badgeClass: 'bg-slate-100 text-slate-700',
        headerClass: 'bg-slate-100',
        categoryBg: 'bg-slate-200/60',
        recipeBg: 'bg-slate-50',
    },
    processamento: {
        id: 'processamento',
        label: 'Processamento',
        shortLabel: 'Proc.',
        role: 'Auxiliar',
        when: 'No dia (antes de cozinhar)',
        bgClass: 'bg-zinc-50',
        borderClass: 'border-zinc-300',
        textClass: 'text-zinc-700',
        badgeClass: 'bg-zinc-100 text-zinc-700',
        headerClass: 'bg-zinc-100',
        categoryBg: 'bg-zinc-200/60',
        recipeBg: 'bg-zinc-50',
    },
    sem_categoria: {
        id: 'sem_categoria',
        label: 'Itens Sem Setor Definido',
        shortLabel: 'Sem Setor',
        role: 'Não Atribuído',
        when: 'Verificar',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
        textClass: 'text-red-700',
        badgeClass: 'bg-red-100 text-red-700',
        headerClass: 'bg-red-50',
        categoryBg: 'bg-red-100/50',
        recipeBg: 'bg-red-50/30',
    },
};

/**
 * Normaliza nomes de ingredientes para consolidação global
 * Ex: "Alho Triturado" -> "alho"
 *     "Cebola Picada" -> "cebola"
 */
export function getCanonicalIngredientName(name) {
    if (!name) return '';
    const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Mapeamentos diretos de variações comuns
    if (lower.includes('alho')) return 'alho';
    if (lower.includes('cebola')) return 'cebola';
    if (lower.includes('cenoura')) return 'cenoura';
    if (lower.includes('tomate')) return 'tomate';

    return lower;
}

/**
 * Calcula o peso de rendimento de uma receita (helper)
 */
function getRecipeYieldWeight(recipe) {
    if (!recipe) return 0;
    const metrics = RecipeCalculator.calculateRecipeMetrics(recipe.preparations, recipe);
    return metrics.yield_weight || 0;
}

/**
 * Process a single ingredient recursively.
 * Checks if it matches a Recipe (Implicit Link) and explodes it if so.
 * Otherwise adds it as a leaf ingredient via callback.
 */
function processIngredientOrExplode(ing, parentScale, onLeafFound, allRecipes, orderCustomerName, visitedIds, originId = null) {
    const weightRaw = RecipeCalculator.getInitialWeight(ing);
    if (weightRaw <= 0) return;

    const ingName = (ing.name || '').trim();
    if (!ingName || /^\d+\.\s/.test(ingName)) return;

    // Check for Implicit Link (Recipe with same name)
    const matchingRecipe = allRecipes.find(r => r.name === ingName);

    if (matchingRecipe) {
        // Prevent infinite loops
        if (visitedIds.has(matchingRecipe.id)) return;
        const defYield = getRecipeYieldWeight(matchingRecipe);
        if (defYield > 0) {
            const subScale = (weightRaw / defYield) * parentScale;
            recursiveExplode(matchingRecipe, subScale, onLeafFound, allRecipes, `${orderCustomerName} > ${ingName}`, new Set(visitedIds));
            return; // Done
        }
    }

    // Leaf Ingredient: Execute Callback
    const scaledWeight = weightRaw * parentScale;
    if (orderCustomerName.toLowerCase().includes('panqueca')) {
        console.log(`[DEBUG EXPLODE] Leaf found: ${ingName} | weight: ${scaledWeight} | context: ${orderCustomerName} | task_types:`, ing.task_type, '| originId:', originId);
    }
    onLeafFound(ing, scaledWeight, orderCustomerName, originId);
}

/**
 * Explodes a Recipe Definition recursively.
 * Iterates Ingredients and Explicit Sub-Recipes.
 */
function recursiveExplode(def, currentScale, onLeafFound, allRecipes, contextStr, visitedIds) {
    visitedIds.add(def.id);

    if (def.preparations && Array.isArray(def.preparations)) {
        def.preparations.forEach(prep => {
            const originId = prep.origin_id || null;
            if (prep.ingredients && Array.isArray(prep.ingredients)) {
                prep.ingredients.forEach(ing => {
                    processIngredientOrExplode(ing, currentScale, onLeafFound, allRecipes, contextStr, visitedIds, originId);
                });
            }

            if (prep.recipes && Array.isArray(prep.recipes)) {
                prep.recipes.forEach(sub => {
                    const subDef = allRecipes.find(r => r.id === sub.recipe_id) || allRecipes.find(r => r.name === sub.name);
                    if (!subDef) return;

                    if (visitedIds.has(subDef.id)) return;
                    const subYield = getRecipeYieldWeight(subDef);
                    const used = parseNumber(sub.used_weight);
                    if (subYield > 0 && used > 0) {
                        const nextScale = (used / subYield) * currentScale;
                        recursiveExplode(subDef, nextScale, onLeafFound, allRecipes, `${contextStr} > ${subDef.name}`, new Set(visitedIds));
                    }
                });
            }
        });
    }
}

// Helper para gerar key simples (caso canônico falhe ou não exista)
function getNameKey(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Hook principal: classifica ingredientes e gera relatórios.
 * task_type é salvo POR INGREDIENTE (não por preparation).
 */
export function useTaskDistribution(orders = [], recipes = [], setRecipes, selectedDay = 1, categories = []) {
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [optimisticTick, setOptimisticTick] = useState(0);

    // Create a Map for O(1) category name lookup
    const categoryMap = useMemo(() => {
        const map = new Map();
        if (categories && Array.isArray(categories)) {
            categories.forEach(cat => {
                if (cat.id && cat.name) {
                    map.set(cat.id, cat.name);
                }
            });
        }
        return map;
    }, [categories]);

    // =============================================
    // CLASSIFICAÇÃO: Salvar task_type num ingrediente
    // =============================================
    const updateIngredientTaskType = useCallback(async (recipeId, prepIndex, ingIndex, taskType) => {
        setSaving(true);
        setSaveError(null);
        try {
            const recipe = recipes?.find(r => r.id === recipeId);
            if (!recipe?.preparations?.[prepIndex]?.ingredients?.[ingIndex]) {
                throw new Error('Receita, preparação ou ingrediente não encontrado');
            }

            const updatedPreparations = recipe.preparations.map((prep, pIdx) => {
                if (pIdx !== prepIndex) return prep;
                return {
                    ...prep,
                    ingredients: prep.ingredients.map((ing, iIdx) => {
                        if (iIdx !== ingIndex) return ing;
                        return { ...ing, task_type: taskType || null };
                    }),
                };
            });

            // Mutação otimista global via context hook
            if (setRecipes) {
                setRecipes(prevRecipes => prevRecipes.map(r =>
                    r.id === recipeId ? { ...r, preparations: updatedPreparations } : r
                ));
            } else {
                // Fallback para mutação in-loco síncrona se não for provido
                recipe.preparations = updatedPreparations;
            }
            setOptimisticTick(t => t + 1);

            await updateDoc(doc(db, 'Recipe', recipeId), {
                preparations: updatedPreparations,
                updatedAt: Timestamp.now(),
            });

            return true;
        } catch (err) {
            console.error('Erro ao salvar task_type do ingrediente:', err);
            setSaveError(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    }, [recipes]);

    // =============================================
    // ESTATÍSTICAS
    // =============================================
    const configStats = useMemo(() => {
        if (!recipes || recipes.length === 0) return { total: 0, configured: 0, percentage: 0 };

        const recipesWithPreps = recipes.filter(r =>
            r.preparations?.some(p => p.ingredients?.length > 0)
        );

        const configured = recipesWithPreps.filter(r =>
            r.preparations?.some(p =>
                p.ingredients?.some(ing => {
                    const tt = ing.task_type;
                    return Array.isArray(tt) ? tt.length > 0 : !!tt;
                })
            )
        );

        return {
            total: recipesWithPreps.length,
            configured: configured.length,
            percentage: recipesWithPreps.length > 0
                ? Math.round((configured.length / recipesWithPreps.length) * 100)
                : 0,
        };
    }, [recipes, optimisticTick]);

    // =============================================
    // RELATÓRIO: Gerar listas por task_type
    // =============================================
    const taskReports = useMemo(() => {
        const emptyResult = {
            rendimento: [], pre_preparo: [], processamento: [], sem_categoria: [],
            grouped: { rendimento: {}, pre_preparo: {}, processamento: {}, sem_categoria: {} },
        };

        if (!orders || !recipes || orders.length === 0 || recipes.length === 0) {
            return emptyResult;
        }

        const dayOrders = orders.filter(o => o.day_of_week === selectedDay);
        if (dayOrders.length === 0) return emptyResult;

        // Flat maps for consolidated totals
        const taskMaps = {
            rendimento: new Map(),
            pre_preparo: new Map(),
            processamento: new Map(),
            sem_categoria: new Map(),
        };

        // Global consolidated: sums ingredient weights across ALL task types
        const globalConsolidated = new Map();

        // Grouped: { taskType -> { category -> { recipeName -> { ... } } } }
        const grouped = {
            rendimento: {},
            pre_preparo: {},
            processamento: {},
            sem_categoria: {},
        };

        dayOrders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(orderItem => {
                if (!orderItem.recipe_id) return;

                const recipe = recipes.find(r => r.id === orderItem.recipe_id);
                if (!recipe?.preparations) return;

                const orderedQty = parseNumber(orderItem.quantity);
                if (orderedQty <= 0) return;

                const recipeYieldWeight = getRecipeYieldWeight(recipe);
                if (recipeYieldWeight <= 0) return;

                let unitsQuantity = 1;
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep?.assembly_config?.units_quantity) {
                    unitsQuantity = parseNumber(lastPrep.assembly_config.units_quantity) || 1;
                }

                // Detect if product is sold by weight using the assembly_config.unit_type
                // from the Porcionamento step ("kg" = Quilo, "un" = Unidade)
                const assemblyUnitType = (lastPrep?.assembly_config?.unit_type || '').toLowerCase();
                const orderUnitType = (orderItem.unit_type || recipe.unit_type || recipe.container_type || '').toLowerCase();
                const isSoldByWeight = assemblyUnitType === 'kg'
                    || orderUnitType === 'kg'
                    || orderUnitType.includes('cuba');

                let scaleFactor;
                if (isSoldByWeight) {
                    // Weight-based: ordered qty in kg ÷ recipe yield in kg
                    scaleFactor = orderedQty / recipeYieldWeight;
                } else {
                    // Unit-based: ordered units ÷ recipe units per batch
                    scaleFactor = orderedQty / unitsQuantity;
                }
                if (scaleFactor <= 0 || !isFinite(scaleFactor)) return;

                // DYNAMIC CATEGORY RESOLUTION
                let categoryName = recipe.category || 'Outros';

                // 1. Try ID lookup (Best)
                if (recipe.category_id && categoryMap.has(recipe.category_id)) {
                    categoryName = categoryMap.get(recipe.category_id);
                }
                // 2. Try Name lookup (Fallback for legacy items without ID)
                else if (recipe.category) {
                    // Reverse lookup: Find if any category name matches the recipe.category string (normalized)
                    // This is expensive O(N) inside loop, but N (categories) is small (~50).
                    // Optimization: Pre-compute name->name map could be better if performance issues arise.
                    const normalizedStatic = recipe.category.trim().toLowerCase();
                    for (const [id, name] of categoryMap.entries()) {
                        if (name.trim().toLowerCase() === normalizedStatic) {
                            categoryName = name; // Use the canonical name from config
                            break;
                        }
                    }
                }
                const category = categoryName.toUpperCase();

                const orderCustomerName = `${recipe.name} (${order.customer_name})`;
                const isTargetDebug = orderCustomerName.toLowerCase().includes('panqueca');

                if (isTargetDebug) {
                    console.log(`\n\n[DEBUG MAIN] Start processing main order: ${orderCustomerName}`);
                }

                // 1. Traverse and extract all leaf ingredients (deep nested sub-recipes)
                const leafIngredients = [];
                recursiveExplode(recipe, scaleFactor, (ing, scaledWeight, contextStr, originId) => {
                    leafIngredients.push({ ing, scaledWeight, contextStr, originId });
                }, recipes, orderCustomerName, new Set());

                if (isTargetDebug) {
                    console.log(`[DEBUG MAIN] Total leaf ingredients found for ${recipe.name}:`, leafIngredients.length, leafIngredients.map(l => l.ing.name));
                }

                // Track task groups touched to increment orderQty exactly once per unique top-level item
                const touchedTaskTypes = new Set();

                leafIngredients.forEach(({ ing, scaledWeight, contextStr, originId }) => {
                    let taskTypes = Array.isArray(ing.task_type)
                        ? ing.task_type
                        : (ing.task_type ? [ing.task_type] : []);

                    // DYNAMIC INHERITANCE: NATIVE RELATIONAL MODE
                    // Se o ingrediente estiver dentro de uma etapa que foi importada
                    // de outra receita (marcada nativamente com origin_id), nós SEMPRE
                    // puxamos fisicamente a receita verdadeira do banco de dados (by ID) 
                    // e copiamos suas marcações, ignorando qualquer clone residual.
                    if (originId) {
                        const baseRecipe = recipes.find(r => r.id === originId);
                        if (baseRecipe) {
                            for (const bp of baseRecipe.preparations || []) {
                                // Double check against ingredient_id primarily for exact matching, fallback to name
                                const foundIng = bp.ingredients?.find(bi =>
                                    (bi.ingredient_id && ing.ingredient_id && bi.ingredient_id === ing.ingredient_id) ||
                                    bi.name === ing.name
                                );
                                if (foundIng) {
                                    const baseTaskTypes = Array.isArray(foundIng.task_type) ? foundIng.task_type : (foundIng.task_type ? [foundIng.task_type] : []);
                                    // SOBRESCREVE incondicionalmente pelo que está na raiz
                                    taskTypes = baseTaskTypes;
                                    if (isTargetDebug) {
                                        console.log(`[DEBUG INHERITANCE] Inherited via origin_id! ${ing.name} puxou task_type ${taskTypes} da receita base (ID: ${originId})`);
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    if (taskTypes.length === 0) {
                        taskTypes = ['sem_categoria'];
                    }

                    if (isTargetDebug && (ing.name || '').toLowerCase().includes('farinha')) {
                        console.log(`[DEBUG PROCESSING LEAF] Farinha found in ${contextStr}. Assigned task types:`, taskTypes);
                    }

                    const ingName = (ing.name || '').trim();
                    const key = ingName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    // === GLOBAL CONSOLIDATED ===
                    const canonicalName = getCanonicalIngredientName(ingName);
                    const globalKey = canonicalName || key;
                    if (globalConsolidated.has(globalKey)) {
                        const entry = globalConsolidated.get(globalKey);
                        entry.totalWeight += scaledWeight;
                        if (!entry.sourceRecipes.includes(orderCustomerName)) {
                            entry.sourceRecipes.push(orderCustomerName);
                        }
                    } else {
                        globalConsolidated.set(globalKey, {
                            name: canonicalName.charAt(0).toUpperCase() + canonicalName.slice(1),
                            totalWeight: scaledWeight,
                            sourceRecipes: [orderCustomerName],
                        });
                    }

                    // === INDIVIDUAL TASK MAPPING ===
                    taskTypes.forEach(taskType => {
                        if (!taskMaps[taskType]) return;

                        // === GROUPED: category -> TOP LEVEL recipe -> ingredients ===
                        const groupTarget = grouped[taskType];
                        if (groupTarget) {
                            if (!groupTarget[category]) groupTarget[category] = {};
                            const recipeKey = recipe.name;
                            if (!groupTarget[category][recipeKey]) {
                                groupTarget[category][recipeKey] = {
                                    recipeName: recipe.name,
                                    recipeId: recipe.id,
                                    orderQty: 0,
                                    unitType: isSoldByWeight ? 'kg' : (assemblyUnitType || orderUnitType || 'un'),
                                    portionWeight: recipe.portion_weight_calculated || 0,
                                    ingredients: new Map(),
                                };
                            }
                            const rg = groupTarget[category][recipeKey];

                            if (!touchedTaskTypes.has(taskType)) {
                                rg.orderQty += orderedQty;
                                touchedTaskTypes.add(taskType);
                            }

                            if (rg.ingredients.has(key)) {
                                rg.ingredients.get(key).totalWeight += scaledWeight;
                            } else {
                                rg.ingredients.set(key, {
                                    name: ingName,
                                    displayName: ingName.charAt(0).toUpperCase() + ingName.slice(1),
                                    totalWeight: scaledWeight,
                                    unit: 'kg',
                                });
                            }
                        }

                        // === FLAT MAP (per task type) ===
                        const targetMap = taskMaps[taskType];
                        if (targetMap.has(key)) {
                            const existing = targetMap.get(key);
                            existing.totalWeight += scaledWeight;
                            if (!existing.sourceRecipes.includes(contextStr)) {
                                existing.sourceRecipes.push(contextStr);
                            }
                        } else {
                            targetMap.set(key, {
                                name: ingName,
                                displayName: ingName.charAt(0).toUpperCase() + ingName.slice(1),
                                totalWeight: scaledWeight,
                                unit: 'kg',
                                sourceRecipes: [contextStr],
                                recipeName: recipe.name,
                                prepTitle: '',
                            });
                        }
                    });
                });
            });
        });

        // Convert flat maps to sorted arrays
        const result = {};
        for (const [taskType, map] of Object.entries(taskMaps)) {
            result[taskType] = Array.from(map.values())
                .filter(item => item.totalWeight > 0.001)
                .sort((a, b) => b.totalWeight - a.totalWeight);
        }

        // Convert grouped Maps to arrays (ALL types)
        const groupedResult = {};
        for (const [taskType, catMap] of Object.entries(grouped)) {
            groupedResult[taskType] = {};
            for (const [cat, recipesMap] of Object.entries(catMap)) {
                groupedResult[taskType][cat] = Object.values(recipesMap).map(rg => ({
                    ...rg,
                    ingredients: Array.from(rg.ingredients.values())
                        .filter(i => i.totalWeight > 0.001)
                        .sort((a, b) => b.totalWeight - a.totalWeight),
                }));
            }
        }
        result.grouped = groupedResult;

        // Global consolidated: total weight of each ingredient across ALL task types
        result.globalConsolidated = Object.fromEntries(
            Array.from(globalConsolidated.entries()).map(([k, v]) => [
                k,
                { totalWeight: v.totalWeight, sourceCount: v.sourceRecipes.length }
            ])
        );

        return result;
    }, [orders, recipes, selectedDay, optimisticTick]);

    return {
        updateIngredientTaskType,
        configStats,
        saving,
        saveError,
        taskReports,
        TASK_TYPES,
    };
}
