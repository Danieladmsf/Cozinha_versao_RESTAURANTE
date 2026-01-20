/**
 * Recipe Import Service
 * 
 * Serviço centralizado para importar receitas como preparações.
 * Este é o ÚNICO ponto de entrada para criar vinculações entre receitas.
 * 
 * @module lib/services/recipeImportService
 */

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Importa uma receita como preparação
 * 
 * @param {string} sourceRecipeId - ID da receita a ser importada (pai)
 * @param {object} options - Opções de importação
 * @param {number} options.scaleFactor - Fator de escala (1.0 = 100%)
 * @param {number} options.prepIndex - Índice da preparação (para título)
 * @returns {Promise<{preparation: object, parentInfo: object}>}
 */
export async function importRecipeAsPreparation(sourceRecipeId, options = {}) {
    const { scaleFactor = 1.0, prepIndex = 0 } = options;

    // 1. Buscar receita fonte
    const sourceRef = doc(db, 'Recipe', sourceRecipeId);
    const sourceSnap = await getDoc(sourceRef);

    if (!sourceSnap.exists()) {
        throw new Error(`Receita não encontrada: ${sourceRecipeId}`);
    }

    const sourceData = sourceSnap.data();
    const sourcePreparations = sourceData.preparations || [];

    // 2. Coletar todos os ingredientes de todas as preparações
    const importedIngredients = [];
    const collectedProcesses = new Set();

    sourcePreparations.forEach(prep => {
        // Coletar processos (exceto 'portioning', 'assembly', 'recipe')
        if (prep.processes) {
            prep.processes.forEach(p => {
                if (!['portioning', 'assembly', 'recipe'].includes(p)) {
                    collectedProcesses.add(p);
                }
            });
        }

        // Coletar ingredientes
        if (prep.ingredients) {
            prep.ingredients.forEach(ing => {
                const importedIng = createImportedIngredient(ing, sourceRecipeId, sourceData.name, scaleFactor);
                importedIngredients.push(importedIng);
            });
        }
    });

    // 3. Garantir pelo menos um processo
    if (collectedProcesses.size === 0) {
        collectedProcesses.add('cooking');
    }

    // 4. Criar preparação estruturada
    const preparation = {
        title: `${prepIndex + 1}º Etapa: ${sourceData.name}`,
        processes: Array.from(collectedProcesses),
        ingredients: importedIngredients,
        recipes: [],
        sub_components: [],
        instructions: "",

        // CRÍTICO: Referência clara ao pai
        source_recipe_id: sourceRecipeId,
        source_recipe_name: sourceData.name
    };

    // 5. Informação do pai para registro
    const parentInfo = {
        id: sourceRecipeId,
        name: sourceData.name,
        prep_index: prepIndex
    };

    return { preparation, parentInfo };
}

/**
 * Cria um ingrediente importado com todos os campos de rastreamento
 * 
 * @param {object} originalIng - Ingrediente original
 * @param {string} sourceRecipeId - ID da receita pai
 * @param {string} sourceRecipeName - Nome da receita pai
 * @param {number} scaleFactor - Fator de escala
 * @returns {object} Ingrediente formatado para importação
 */
function createImportedIngredient(originalIng, sourceRecipeId, sourceRecipeName, scaleFactor) {
    // Gerar ID único para este ingrediente importado
    const uniqueId = `${sourceRecipeId}_${originalIng.ingredient_id || originalIng.id}_${Date.now()}`;

    // Campos de peso que devem ser escalados
    const weightFields = ['weight_raw', 'weight_clean', 'weight_cooked', 'yield_weight'];

    const scaledIng = { ...originalIng };

    // Aplicar escala aos campos de peso
    if (scaleFactor !== 1.0) {
        weightFields.forEach(field => {
            if (scaledIng[field]) {
                const value = parseFloat(String(scaledIng[field]).replace(',', '.')) || 0;
                if (value > 0) {
                    scaledIng[field] = (value * scaleFactor).toFixed(3);
                }
            }
        });
    }

    return {
        ...scaledIng,

        // ID único do ingrediente importado
        id: uniqueId,

        // CRÍTICO: Rastreamento do pai
        source_recipe_id: sourceRecipeId,
        source_recipe_name: sourceRecipeName,
        // CRÍTICO: Usar ingredient_id como chave para sync (não o ID único da instância)
        source_ingredient_id: originalIng.ingredient_id || originalIng.id,

        // Marcar como bloqueado (não editável diretamente)
        locked: true,

        // Remover campos legados que podem causar confusão
        origin_recipe_id: undefined,
        origin_recipe_name: undefined
    };
}

/**
 * Extrai array de parent_recipes a partir das preparações
 * Deve ser chamado antes de salvar uma receita
 * 
 * @param {array} preparations - Array de preparações
 * @returns {array} Array de objetos {id, name, prep_index}
 */
export function extractParentRecipes(preparations) {
    const parents = [];

    preparations.forEach((prep, index) => {
        if (prep.source_recipe_id) {
            // Verificar se já não está na lista (evitar duplicatas)
            const exists = parents.some(p => p.id === prep.source_recipe_id);
            if (!exists) {
                parents.push({
                    id: prep.source_recipe_id,
                    name: prep.source_recipe_name || 'Receita Vinculada',
                    prep_index: index
                });
            }
        }
    });

    return parents;
}

/**
 * Valida se uma preparação tem vínculo válido com receita pai
 * 
 * @param {object} preparation - Preparação a validar
 * @returns {boolean}
 */
export function hasValidParentLink(preparation) {
    return Boolean(preparation.source_recipe_id);
}
