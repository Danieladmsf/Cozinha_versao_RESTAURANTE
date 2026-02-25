import { RecipeEngine } from '../recipe-engine/RecipeEngine';

/**
 * Normaliza nomes de ingredientes para consolidação global
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
 * MOTOR DE EXPLOSÃO DE DEMANDA (DemandCalculator)
 * 
 * Responsável por traduzir um Pedido de Venda/Produção em uma lista exata
 * de insumos (Alimentos Crus e Embalagens) necessários para produzi-lo.
 * 
 * Blindado contra duplicação de peso e mistura de categorias de unidade.
 */
export class DemandCalculator {

    static parseNumber(val) {
        return RecipeEngine.parseValue(val);
    }

    /**
     * Extrai o peso de rendimento de uma receita usando o RecipeEngine.
     * Única fonte da verdade.
     */
    static getRecipeYieldWeight(recipe, allRecipes = []) {
        if (!recipe) return 0;
        const metrics = RecipeEngine.calculateRecipeMetrics(recipe, recipe.preparations || [], allRecipes);
        return metrics.yield_weight || 0;
    }

    /**
     * Função principal: Recebe Orders, cruza com Recipes e devolve a lista
     * consolidada de ingredientes "folha".
     * 
     * @param {Array} orders - Pedidos (com order.items)
     * @param {Array} allRecipes - Todas as receitas do DB
     * @param {Map} categoryMap - Mapa de (categoryId -> categoryName)
     * @returns {Object} result com folhas explodidas
     */
    static explodeOrders(orders, allRecipes, categoryMap) {
        const leafIngredients = [];

        if (!orders || !allRecipes || orders.length === 0 || allRecipes.length === 0) {
            return leafIngredients;
        }

        orders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(orderItem => {
                if (!orderItem.recipe_id) return;

                const recipe = allRecipes.find(r => r.id === orderItem.recipe_id);
                if (!recipe?.preparations) return;

                const orderedQty = this.parseNumber(orderItem.quantity);
                if (orderedQty <= 0) return;

                const recipeYieldWeight = this.getRecipeYieldWeight(recipe, allRecipes);
                if (recipeYieldWeight <= 0) return;

                let unitsQuantity = 1;
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep?.assembly_config?.units_quantity) {
                    unitsQuantity = this.parseNumber(lastPrep.assembly_config.units_quantity) || 1;
                }

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
                if (recipe.category_id && categoryMap.has(recipe.category_id)) {
                    const catData = categoryMap.get(recipe.category_id);
                    categoryName = (typeof catData === 'object' && catData?.name) ? catData.name : (catData || categoryName);
                } else if (recipe.category && typeof recipe.category === 'string') {
                    const normalizedStatic = recipe.category.trim().toLowerCase();
                    for (const [id, nameData] of categoryMap.entries()) {
                        const nameStr = (typeof nameData === 'object' && nameData?.name) ? nameData.name : nameData;
                        if (nameStr && typeof nameStr === 'string' && nameStr.trim().toLowerCase() === normalizedStatic) {
                            categoryName = nameStr;
                            break;
                        }
                    }
                }
                const category = categoryName.toUpperCase();
                const contextStr = `${recipe.name} (${order.customer_name || 'Geral'})`;

                // Iniciar explosão recursiva
                this.recursiveExplode({
                    def: recipe,
                    currentScale: scaleFactor,
                    allRecipes,
                    contextStr,
                    visitedIds: new Set(),
                    onLeafFound: (ing, scaledQty, context, originId) => {
                        // Tipar e guardar
                        leafIngredients.push({
                            ingredient: ing,
                            scaledQty: scaledQty, // Pode ser Peso ou Unidade dependendo do tipo
                            contextStr: context,
                            originId: originId,
                            topLevelCategory: category,
                            topLevelRecipeId: recipe.id,
                            topLevelRecipeName: recipe.name,
                            topLevelOrderedQty: orderedQty,
                            topLevelIsSoldByWeight: isSoldByWeight,
                            topLevelAssemblyUnit: assemblyUnitType || orderUnitType || 'un',
                            topLevelPortionWeight: recipe.portion_weight_calculated || 0
                        });
                    }
                });
            });
        });

        return leafIngredients;
    }

    /**
     * Navega pela árvore da receita explodindo sub-receitas.
     */
    static recursiveExplode({ def, currentScale, allRecipes, contextStr, visitedIds, onLeafFound }) {
        if (!def || !def.id) return;

        visitedIds.add(def.id);

        if (def.preparations && Array.isArray(def.preparations)) {
            def.preparations.forEach(prep => {
                const originId = prep.origin_id || null;

                // 1. Explode Explicit Ingredients in the prep
                if (prep.ingredients && Array.isArray(prep.ingredients)) {
                    prep.ingredients.forEach(ing => {
                        this.processIngredientOrExplode({
                            ing,
                            parentScale: currentScale,
                            allRecipes,
                            contextStr,
                            visitedIds,
                            originId,
                            onLeafFound
                        });
                    });
                }

                // 2. Explode Explicit Sub-Recipes added via composition
                if (prep.recipes && Array.isArray(prep.recipes)) {
                    prep.recipes.forEach(sub => {
                        const subDef = allRecipes.find(r => r.id === sub.recipe_id) || allRecipes.find(r => r.name === sub.name);
                        if (!subDef) return;

                        if (visitedIds.has(subDef.id)) return;

                        const subYield = this.getRecipeYieldWeight(subDef, allRecipes);
                        const used = this.parseNumber(sub.used_weight);

                        if (subYield > 0 && used > 0) {
                            const nextScale = (used / subYield) * currentScale;
                            this.recursiveExplode({
                                def: subDef,
                                currentScale: nextScale,
                                allRecipes,
                                contextStr: `${contextStr} > ${subDef.name}`,
                                visitedIds: new Set(visitedIds),
                                onLeafFound
                            });
                        }
                    });
                }
            });
        }
    }

    /**
     * Processa um ingrediente: verifica se é uma sub-receita implícita (pelo nome)
     * ou se é um ingrediente folha real. Se folha, classifica (comida vs embalagem).
     */
    static processIngredientOrExplode({ ing, parentScale, allRecipes, contextStr, visitedIds, originId, onLeafFound }) {
        // Validações anti-lixo (notas, instruções)
        const ingName = (ing.name || '').trim();
        if (!ingName || /^\d+\.\s/.test(ingName) || ingName.length > 80) return;

        const isNoteByText = ingName.toLowerCase().includes('refrigerado') || ingName.toLowerCase().includes('congelado') || ingName.toLowerCase().includes('fogo médio');
        if (isNoteByText) return;

        const isClearlyNote = !parseFloat(ing.weight_raw) && !ing.unit && (ingName.match(/[;.!]$/) || ingName.split(' ').length > 6);
        if (isClearlyNote) return;

        // Verificar se é uma Embalagem (isPackaging)
        const isPkg = ing.isPackaging || ing.is_packaging || (ing.unit === 'un' && !RecipeEngine.getInitialWeight(ing));

        let qtyRaw = 0;
        let unit = ing.unit || 'kg';
        let type = 'food';

        if (isPkg) {
            qtyRaw = this.parseNumber(ing.quantity);
            type = 'packaging';
            unit = 'un';
        } else {
            qtyRaw = RecipeEngine.getInitialWeight(ing);
            type = 'food';
        }

        if (qtyRaw <= 0) return;

        // Check for Implicit Link (Recipe with same name - only for Food)
        if (type === 'food') {
            const matchingRecipe = allRecipes.find(r => r.name === ingName);
            if (matchingRecipe) {
                if (visitedIds.has(matchingRecipe.id)) return;
                const defYield = this.getRecipeYieldWeight(matchingRecipe, allRecipes);
                if (defYield > 0) {
                    const subScale = (qtyRaw / defYield) * parentScale;
                    this.recursiveExplode({
                        def: matchingRecipe,
                        currentScale: subScale,
                        allRecipes,
                        contextStr: `${contextStr} > ${ingName}`,
                        visitedIds: new Set(visitedIds),
                        onLeafFound
                    });
                    return; // Done
                }
            }
        }

        // É uma folha real
        const scaledQty = qtyRaw * parentScale;

        // Passa adiante com a flag de tipo adicionada dinamicamente ao objeto 'ing' para reports
        const enrichedIng = { ...ing, item_type: type, canonical_unit: unit };
        onLeafFound(enrichedIng, scaledQty, contextStr, originId);
    }
}
