import { useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { RecipeEngine as RecipeCalculator } from '@/lib/recipe-engine/RecipeEngine';
import { DemandCalculator, getCanonicalIngredientName } from '@/lib/production-engine/DemandCalculator';
const parseNumber = RecipeCalculator.parseValue;
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

        const dayOrders = orders.filter(o => Number(o.day_of_week) === Number(selectedDay));
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

        // EXPLODIR PEDIDOS USANDO O NOVO MOTOR BLINDADO
        const leafIngredients = DemandCalculator.explodeOrders(dayOrders, recipes, categoryMap);

        // Track task groups touched to increment orderQty exactly once per unique top-level item
        const touchedTaskTypes = new Set();

        leafIngredients.forEach(({
            ingredient: ing,
            scaledQty: scaledWeight,
            contextStr,
            originId,
            topLevelCategory: category,
            topLevelRecipeId: recipeId,
            topLevelRecipeName: recipeName,
            topLevelOrderedQty: orderedQty,
            topLevelIsSoldByWeight: isSoldByWeight,
            topLevelAssemblyUnit,
            topLevelPortionWeight
        }) => {
            let taskTypes = [];
            // Check local configuration:
            // If undefined -> never configured (inherit from base)
            // If null -> explicitly cleared by user (keep empty)
            // If array -> explicitly set by user (keep array)
            const hasLocalEdit = ing.task_type !== undefined;

            if (hasLocalEdit) {
                taskTypes = Array.isArray(ing.task_type) ? ing.task_type : (ing.task_type ? [ing.task_type] : []);
            }

            // DYNAMIC INHERITANCE: NATIVE RELATIONAL MODE
            // Se o ingrediente estiver dentro de uma etapa matriz E não houver edição local
            if (!hasLocalEdit && originId) {
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
                            // SOBRESCREVE apenas porque não houve edição local
                            taskTypes = baseTaskTypes;
                            break;
                        }
                    }
                }
            }

            if (taskTypes.length === 0) {
                taskTypes = ['sem_categoria'];
            }

            const isTargetDebug = contextStr.toLowerCase().includes('panqueca');
            if (isTargetDebug && (ing.name || '').toLowerCase().includes('farinha')) {
                console.log(`[DEBUG PROCESSING LEAF] Farinha found in ${contextStr}. Assigned task types:`, taskTypes, '| originId:', originId, '| hasLocalEdit:', hasLocalEdit);
            }

            const ingName = (ing.name || '').trim();
            const key = ingName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // === GLOBAL CONSOLIDATED ===
            const canonicalName = getCanonicalIngredientName(ingName);
            const globalKey = canonicalName || key;
            if (globalConsolidated.has(globalKey)) {
                const entry = globalConsolidated.get(globalKey);
                entry.totalWeight += scaledWeight;
                if (!entry.sourceRecipes.includes(contextStr)) {
                    entry.sourceRecipes.push(contextStr);
                }
            } else {
                globalConsolidated.set(globalKey, {
                    name: canonicalName.charAt(0).toUpperCase() + canonicalName.slice(1),
                    totalWeight: scaledWeight,
                    sourceRecipes: [contextStr],
                });
            }

            // === INDIVIDUAL TASK MAPPING ===
            taskTypes.forEach(taskType => {
                if (!taskMaps[taskType]) return;

                // === GROUPED: category -> TOP LEVEL recipe -> ingredients ===
                const groupTarget = grouped[taskType];
                if (groupTarget) {
                    if (!groupTarget[category]) groupTarget[category] = {};
                    const recipeKey = recipeName;
                    if (!groupTarget[category][recipeKey]) {
                        groupTarget[category][recipeKey] = {
                            recipeName: recipeName,
                            recipeId: recipeId,
                            orderQty: 0,
                            unitType: isSoldByWeight ? 'kg' : (topLevelAssemblyUnit || 'un'),
                            portionWeight: topLevelPortionWeight || 0,
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
                            unit: ing.canonical_unit || 'kg',
                            itemType: ing.item_type || 'food'
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
                        unit: ing.canonical_unit || 'kg',
                        itemType: ing.item_type || 'food',
                        sourceRecipes: [contextStr],
                        recipeName: recipeName,
                        prepTitle: '',
                    });
                }
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
