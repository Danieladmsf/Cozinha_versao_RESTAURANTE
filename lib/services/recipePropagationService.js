/**
 * Recipe Propagation Service
 * 
 * Serviço centralizado para propagar mudanças de uma receita pai para suas filhas.
 * Este é o ÚNICO ponto de entrada para atualização em cadeia.
 * 
 * @module lib/services/recipePropagationService
 */

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

/**
 * Propaga mudanças de uma receita pai para todas as filhas
 * 
 * @param {string} parentId - ID da receita pai que foi alterada
 * @param {object} parentData - Dados atualizados da receita pai
 * @returns {Promise<{count: number, updated: string[], errors: string[]}>}
 */
export async function propagateChangesToChildren(parentId, parentData) {
    const result = {
        count: 0,
        updated: [],
        errors: []
    };

    try {
        console.log(`[PROPAGATION] Iniciando propagação para filhos de: ${parentData.name} (${parentId})`);

        // 1. Construir mapa de ingredientes do pai para lookup rápido
        const parentIngredientMap = buildIngredientMap(parentData);

        if (parentIngredientMap.size === 0) {
            console.log('[PROPAGATION] Receita pai não tem ingredientes. Nada a propagar.');
            return result;
        }

        // 2. Buscar todas as receitas que têm este pai registrado
        const childrenQuery = query(
            collection(db, 'Recipe'),
            where('parent_recipes', 'array-contains-any', [
                { id: parentId },
                // Firestore não suporta partial object match, então precisamos de outra estratégia
            ])
        );

        // Alternativa: Query por campo simples
        // Como array-contains-any não funciona com objetos parciais,
        // vamos fazer uma query mais ampla e filtrar client-side
        const allRecipesSnap = await getDocs(collection(db, 'Recipe'));

        const childDocs = [];
        allRecipesSnap.forEach(docSnap => {
            const data = docSnap.data();
            // Verificar se parent_recipes contém o parentId
            const hasParent = (data.parent_recipes || []).some(p => p.id === parentId);
            // Também verificar se alguma preparação tem source_recipe_id
            const hasSourcePrep = (data.preparations || []).some(p => p.source_recipe_id === parentId);

            if (hasParent || hasSourcePrep) {
                childDocs.push({ id: docSnap.id, data });
            }
        });

        console.log(`[PROPAGATION] Encontradas ${childDocs.length} receitas filhas.`);

        if (childDocs.length === 0) {
            return result;
        }

        // 3. Atualizar cada receita filha
        for (const child of childDocs) {
            try {
                const updateResult = await updateChildRecipe(child, parentId, parentIngredientMap);
                if (updateResult.changed) {
                    result.count++;
                    result.updated.push(child.data.name || child.id);
                    console.log(`[PROPAGATION] Atualizada: ${child.data.name}`);
                }
            } catch (err) {
                console.error(`[PROPAGATION] Erro ao atualizar ${child.data.name}:`, err);
                result.errors.push(child.data.name || child.id);
            }
        }

        return result;

    } catch (error) {
        console.error('[PROPAGATION] Falha geral:', error);
        result.errors.push(error.message);
        return result;
    }
}

/**
 * Constrói mapa de ingredientes do pai para lookup rápido
 * Chave: ID original do ingrediente | Valor: Dados atualizados
 */
function buildIngredientMap(parentData) {
    const map = new Map();

    const parseNum = (val) => {
        if (val === undefined || val === null) return 0;
        return parseFloat(String(val).replace(',', '.')) || 0;
    };

    (parentData.preparations || []).forEach(prep => {
        (prep.ingredients || []).forEach(ing => {
            // CRÍTICO: Usar ingredient_id como chave primária
            const key = ing.ingredient_id || ing.id;
            if (key) {
                const data = {
                    price: parseNum(ing.price),
                    cost_clean: parseNum(ing.cost_clean),
                    weight_raw: parseNum(ing.weight_raw),
                    weight_clean: parseNum(ing.weight_clean) || parseNum(ing.weight_raw),
                    weight_pre_cooking: parseNum(ing.weight_pre_cooking) || parseNum(ing.weight_clean) || parseNum(ing.weight_raw),
                    weight_cooked: parseNum(ing.weight_cooked),
                    yield_percent: parseNum(ing.yield_percent)
                };
                console.log(`[PROPAGATION] Ingrediente ${ing.name}: raw=${data.weight_raw}, pre_cook=${data.weight_pre_cooking}, cooked=${data.weight_cooked}`);
                map.set(key, data);
            }
        });
    });

    console.log(`[PROPAGATION] Mapa construído com ${map.size} ingredientes`);
    return map;
}

/**
 * Atualiza uma receita filha com os dados do pai
 */
async function updateChildRecipe(child, parentId, parentIngredientMap) {
    let hasChanges = false;
    const updatedPreparations = [];

    for (const prep of (child.data.preparations || [])) {
        // Só processar preparações que vêm deste pai
        if (prep.source_recipe_id !== parentId) {
            updatedPreparations.push(prep);
            continue;
        }

        // Atualizar ingredientes desta preparação
        const updatedIngredients = (prep.ingredients || []).map(ing => {
            // Buscar no mapa do pai pelo source_ingredient_id
            const parentIng = parentIngredientMap.get(ing.source_ingredient_id);

            if (!parentIng) {
                // Não encontrou correspondência, manter como está
                return ing;
            }

            // Calcular novos valores
            const updates = calculateIngredientUpdates(ing, parentIng);

            if (updates.changed) {
                hasChanges = true;
                return { ...ing, ...updates.values };
            }

            return ing;
        });

        updatedPreparations.push({
            ...prep,
            ingredients: updatedIngredients
        });
    }

    // 4. Salvar se houve mudanças
    if (hasChanges) {
        const childRef = doc(db, 'Recipe', child.id);
        await updateDoc(childRef, {
            preparations: updatedPreparations,
            last_propagation: new Date(),
            propagated_from: parentId
        });
    }

    return { changed: hasChanges };
}

/**
 * Calcula atualizações para um ingrediente baseado nas PROPORÇÕES do pai
 */
function calculateIngredientUpdates(childIng, parentIng) {
    const updates = { changed: false, values: {} };
    const tolerance = 0.0001;

    const parseNum = (val) => {
        if (val === undefined || val === null) return 0;
        return parseFloat(String(val).replace(',', '.')) || 0;
    };

    // 1. Atualizar preço bruto
    const childPrice = parseNum(childIng.price);
    if (Math.abs(childPrice - parentIng.price) > tolerance) {
        updates.values.price = parentIng.price;
        updates.changed = true;
    }

    // 2. Atualizar custo limpo
    const childCostClean = parseNum(childIng.cost_clean);
    if (Math.abs(childCostClean - parentIng.cost_clean) > tolerance) {
        updates.values.cost_clean = parentIng.cost_clean;
        updates.changed = true;
    }

    // 3. Calcular proporções do pai
    const parentRaw = parentIng.weight_raw;
    const parentClean = parentIng.weight_clean || parentRaw;
    const parentPreCook = parentIng.weight_pre_cooking || parentClean;
    const parentCooked = parentIng.weight_cooked || parentPreCook;

    if (parentRaw > 0) {
        const cleanRatio = parentRaw > 0 ? parentClean / parentRaw : 1;
        const preCookRatio = parentClean > 0 ? parentPreCook / parentClean : 1;
        const cookRatio = parentPreCook > 0 ? parentCooked / parentPreCook : 1;

        const childRaw = parseNum(childIng.weight_raw);

        if (childRaw > 0) {
            // Aplicar proporções
            const expectedClean = childRaw * cleanRatio;
            const expectedPreCook = expectedClean * preCookRatio;
            const expectedCooked = expectedPreCook * cookRatio;

            // Verificar weight_clean
            const currentClean = parseNum(childIng.weight_clean);
            if (Math.abs(currentClean - expectedClean) > 0.001) {
                updates.values.weight_clean = expectedClean.toFixed(3);
                updates.changed = true;
            }

            // Verificar weight_pre_cooking
            const currentPreCook = parseNum(childIng.weight_pre_cooking);
            if (Math.abs(currentPreCook - expectedPreCook) > 0.001) {
                updates.values.weight_pre_cooking = expectedPreCook.toFixed(3);
                updates.changed = true;
            }

            // Verificar weight_cooked
            const currentCooked = parseNum(childIng.weight_cooked);
            if (Math.abs(currentCooked - expectedCooked) > 0.001) {
                updates.values.weight_cooked = expectedCooked.toFixed(3);
                updates.changed = true;
            }
        }
    }

    return updates;
}
