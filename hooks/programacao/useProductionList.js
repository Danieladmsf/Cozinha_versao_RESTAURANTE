import { useMemo } from 'react';
import { RecipeCalculator, parseNumber } from '@/lib/recipeCalculator';

/**
 * Hook para calcular a Lista de Produção da Cozinha
 * Cruza pedidos do dia × fichas técnicas para gerar quanto de cada ingrediente cru cozinhar
 *
 * @param {Array} orders - Pedidos filtrados do dia
 * @param {Array} recipes - Todas as receitas do Firebase
 * @param {number} selectedDay - Dia selecionado (0-6)
 * @param {Array} categories - Lista de categorias (para ordenação)
 * @param {Object} categoryMap - Mapa de IDs/Nomes para Categoria/ Pai (para agrupamento)
 * @param {Array} categoryOrder - Array de IDs de categorias definindo a ordem de exibição
 * @returns {{ productionList, totalItems, groups }}
 */

// ============================================================
// CLASSIFICAÇÃO DE INGREDIENTES
// ============================================================

/**
 * Palavras-chave para EXCLUIR (temperos/secundários que nunca serão "principal")
 */
const EXCLUDE_KEYWORDS = [
    'sal ', 'sal,', 'açúcar', 'acucar', 'pimenta', 'orégano', 'oregano',
    'alho', 'cebola', 'óleo', 'oleo', 'azeite', 'vinagre', 'louro',
    'cheiro verde', 'cheiro-verde', 'tempero', 'colorau', 'cominho',
    'ervas', 'salsinha', 'cebolinha', 'margarina', 'manteiga',
    'extrato', 'caldo ', 'caldo,', 'shoyu', 'mostarda', 'ketchup',
    'noz moscada', 'canela', 'cravo', 'curry', 'açafrão', 'acafrao',
    'paprica', 'páprica', 'chimichurri', 'molho inglês', 'molho ingles',
    'glutamato', 'sazon', 'knorr', 'maggi', 'limão', 'limao',
    'suco de limão', 'amido de milho', 'maisena', 'fermento',
    'bicarbonato', 'farinha de rosca', 'fubá', 'fuba',
    // Exclusões adicionais (refinamento)
    'água', 'agua', 'gelo',
    'embalagem', 'embalagens', 'pote', 'tampa', 'k27', 'k22', 'g850', 'g 850',
    'filme', 'papel', 'luva', 'saco', 'sacola', 'd76', 'D76'
];

/**
 * Palavras-chave que SEMPRE são ingredientes principais
 * (Mantido para garantir que itens importantes não sejam filtrados por peso)
 */
const PRINCIPAL_KEYWORDS = [
    'arroz', 'feijão', 'feijao', 'feijoada',
    'macarrão', 'macarrao', 'espaguete', 'penne', 'fusilli', 'parafuso', 'talharim',
    'massa de', 'massa ',
    'carne', 'frango', 'file', 'filé', 'peito', 'coxa', 'sobrecoxa', 'sobre-coxa',
    'costela', 'costelinha', 'linguiça', 'linguica', 'calabresa', 'bacon',
    'picanha', 'alcatra', 'patinho', 'acém', 'acem', 'cupim', 'maminha',
    'pernil', 'lombo', 'bisteca', 'tilápia', 'tilapia', 'salmão', 'salmao',
    'camarão', 'camarao', 'peixe', 'atum', 'bacalhau',
    'drumet', 'sassami', 'strogonoff', 'medalhão', 'medalhao', 'charuto',
    'batata', 'mandioca', 'inhame', 'aipim',
    'polenta', 'purê', 'pure', 'creme',
    'recheio', 'molho', 'queijo', 'presunto', 'mussarela', 'muçarela',
    'ovo ', 'ovos', 'escondidinho', 'leite', 'maionese', 'requeijão', 'chantilly',
    'farofa', 'banana', 'lentilha', 'grão de bico', 'grao de bico',
    'couve', 'repolho', 'brócolis', 'brocolis', 'cenoura', 'beterraba',
    'abóbora', 'abobora', 'chuchu', 'berinjela', 'abobrinha', 'vagem',
    'tomate', 'palmito', 'ervilha', 'milho', 'pepino'
];

/**
 * Verifica se um ingrediente é "principal" baseado no nome e peso
 */
function isPrincipalIngredient(ingredientName, weightRaw, totalPrepWeight) {
    if (!ingredientName) return false;
    const nameLower = ingredientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Verificar exclusão (temperos)
    for (const kw of EXCLUDE_KEYWORDS) {
        const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameLower.includes(kwNorm)) return false;
    }

    // Verificar inclusão por palavra-chave
    for (const kw of PRINCIPAL_KEYWORDS) {
        const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameLower.includes(kwNorm)) return true;
    }

    // Fallback: se o peso bruto do ingrediente é >= 10% do peso total da preparação
    if (totalPrepWeight > 0 && weightRaw > 0) {
        return (weightRaw / totalPrepWeight) >= 0.10;
    }

    return false;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useProductionList(orders, recipes, selectedDay, categories = [], categoryMap = {}, categoryOrder = []) {
    const productionData = useMemo(() => {
        if (!orders || !recipes || orders.length === 0 || recipes.length === 0) {
            return { productionList: [], groups: {}, totalItems: 0 };
        }

        // Filtrar pedidos do dia selecionado
        const dayOrders = orders.filter(o => o.day_of_week === selectedDay);
        if (dayOrders.length === 0) {
            return { productionList: [], groups: {}, totalItems: 0 };
        }

        // Mapa para consolidar ingredientes: chave = nome normalizado + ID da Categoria
        const ingredientMap = new Map();

        dayOrders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(orderItem => {
                if (!orderItem.recipe_id) return;

                // Encontrar receita
                const recipe = recipes.find(r => r.id === orderItem.recipe_id);
                if (!recipe || !recipe.preparations || !Array.isArray(recipe.preparations)) return;

                // Quantidade pedida (em unidades do pedido)
                const orderedQty = parseNumber(orderItem.quantity);
                if (orderedQty <= 0) return;

                // -----------------------------------------------
                // Determinar a Categoria (Grupo)
                // -----------------------------------------------
                let categoryInfo = { name: 'OUTROS', id: null, color: null };

                // 1. Tentar via CategoryMap (ID ou Nome) -> Retorna o objeto da categoria Pai/Principal
                if (recipe.category_id && categoryMap[recipe.category_id]) {
                    categoryInfo = categoryMap[recipe.category_id];
                } else if (recipe.category) {
                    const normCat = recipe.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (categoryMap[normCat]) {
                        categoryInfo = categoryMap[normCat];
                    } else {
                        // Fallback se não estiver no mapa mas tiver nome
                        categoryInfo = { name: recipe.category.toUpperCase(), id: null, color: null };
                    }
                }

                const groupName = categoryInfo.name || 'OUTROS';
                const groupId = categoryInfo.id;
                const groupColor = categoryInfo.color;

                // -----------------------------------------------
                // Calcular o rendimento total da receita (yield weight)
                // -----------------------------------------------
                const metrics = RecipeCalculator.calculateRecipeMetrics(recipe.preparations, recipe);
                const recipeYieldWeight = metrics.yield_weight || 0;

                if (recipeYieldWeight <= 0) return;

                // -----------------------------------------------
                // Determinar Fator de Escala
                // -----------------------------------------------
                let unitsQuantity = 1;
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep?.assembly_config?.units_quantity) {
                    unitsQuantity = parseNumber(lastPrep.assembly_config.units_quantity) || 1;
                }

                let scaleFactor;
                const unitType = (orderItem.unit_type || recipe.unit_type || recipe.container_type || '').toLowerCase();

                if (unitType.includes('cuba') || unitType === 'kg') {
                    scaleFactor = orderedQty / recipeYieldWeight;
                } else {
                    scaleFactor = orderedQty / unitsQuantity;
                }

                if (scaleFactor <= 0 || !isFinite(scaleFactor)) return;

                // -----------------------------------------------
                // Extrair ingredientes principais
                // -----------------------------------------------
                const processIngredient = (ingredient, totalPrepWeight) => {
                    const weightRaw = RecipeCalculator.getInitialWeight(ingredient);
                    if (weightRaw <= 0) return;

                    const ingName = ingredient.name || '';
                    // Usar a mesma lógica de filtro "Principal" para manter consistência com o que o usuário já vê
                    if (!isPrincipalIngredient(ingName, weightRaw, totalPrepWeight)) return;

                    // Peso cru escalado
                    const scaledWeight = weightRaw * scaleFactor;

                    // Chave composta para separar por Categoria
                    const normalizedName = ingName.trim().toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    // A chave inclui o ID do grupo para separar ingredientes iguais em grupos diferentes
                    const compositeKey = `${normalizedName}|${groupName}`;

                    if (ingredientMap.has(compositeKey)) {
                        const existing = ingredientMap.get(compositeKey);
                        existing.totalRawWeight += scaledWeight;
                        const recipeRef = `${recipe.name} (${order.customer_name})`;
                        if (!existing.sourceRecipes.includes(recipeRef)) {
                            existing.sourceRecipes.push(recipeRef);
                        }
                    } else {
                        ingredientMap.set(compositeKey, {
                            name: ingName.trim(),
                            displayName: ingName.trim().charAt(0).toUpperCase() + ingName.trim().slice(1),
                            totalRawWeight: scaledWeight,
                            unit: 'kg',
                            group: groupName,        // Grupo dinâmico
                            groupId: groupId,        // ID para lookup de cor/ordem
                            groupColor: groupColor,  // Cor para UI
                            sourceRecipes: [`${recipe.name} (${order.customer_name})`]
                        });
                    }
                };

                recipe.preparations.forEach(prep => {
                    if (!prep.ingredients || !Array.isArray(prep.ingredients)) return;

                    const totalPrepWeight = prep.ingredients.reduce((sum, ing) => {
                        return sum + RecipeCalculator.getInitialWeight(ing);
                    }, 0);

                    // Ingredientes diretos
                    prep.ingredients.forEach(ing => processIngredient(ing, totalPrepWeight));

                    // Sub-receitas (se houver lógica explícita de sub-receitas na estrutura)
                    if (prep.recipes && Array.isArray(prep.recipes)) {
                        prep.recipes.forEach(subRecipe => {
                            const usedWeight = parseNumber(subRecipe.used_weight);
                            if (usedWeight <= 0) return;

                            // Tratar sub-receita como ingrediente se passar no filtro
                            const subName = subRecipe.name || '';
                            if (isPrincipalIngredient(subName, usedWeight, totalPrepWeight)) {
                                // Lógica simplificada: adicionar a sub-receita como item da lista
                                // (Idealmente explodiria recursivamente, mas mantendo paridade com anterior por enquanto)
                                const scaledWeight = usedWeight * scaleFactor;
                                const normalizedName = subName.trim().toLowerCase()
                                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const compositeKey = `${normalizedName}|${groupName}`;

                                if (ingredientMap.has(compositeKey)) {
                                    const existing = ingredientMap.get(compositeKey);
                                    existing.totalRawWeight += scaledWeight;
                                    const recipeRef = `${recipe.name} (${order.customer_name})`;
                                    if (!existing.sourceRecipes.includes(recipeRef)) {
                                        existing.sourceRecipes.push(recipeRef);
                                    }
                                } else {
                                    ingredientMap.set(compositeKey, {
                                        name: subName.trim(),
                                        displayName: subName.trim().charAt(0).toUpperCase() + subName.trim().slice(1),
                                        totalRawWeight: scaledWeight,
                                        unit: 'kg',
                                        group: groupName,
                                        groupId: groupId,
                                        groupColor: groupColor,
                                        sourceRecipes: [`${recipe.name} (${order.customer_name})`]
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });

        // Converter mapa para array e ordenar por peso
        const productionList = Array.from(ingredientMap.values())
            .filter(item => item.totalRawWeight > 0.001)
            .sort((a, b) => b.totalRawWeight - a.totalRawWeight);

        // Agrupar por Categoria (Nome do Grupo)
        const groups = {};
        productionList.forEach(item => {
            if (!groups[item.group]) {
                groups[item.group] = [];
            }
            groups[item.group].push(item);
        });

        // Ordenar os GRUPOS
        const orderedGroups = {};

        // 1. Se tivermos uma orgem configurada (menuConfig.category_order)
        if (categoryOrder && categoryOrder.length > 0 && categories.length > 0) {
            // Iterar sobre os IDs na ordem configurada
            categoryOrder.forEach(catId => {
                // Encontrar a categoria correspondente ao ID
                const category = categories.find(c => c.id === catId);
                if (category) {
                    const groupName = category.name; // O nome do grupo é o nome da categoria
                    // Se existe itens para esse grupo, adicionar na ordem
                    if (groups[groupName]) {
                        orderedGroups[groupName] = groups[groupName];
                        delete groups[groupName]; // Remove do objeto original para saber o que sobrou
                    }
                }
            });
        }
        // 2. Fallback: Se não tiver ordem configurada, tentar pela lista de categories (alfabética ou padrão)
        else if (categories && categories.length > 0) {
            // Filtrar apenas categorias de nível 1 (Pai) pois agrupa pelo Pai
            const parentCategories = categories.filter(c => c.level === 1);

            // Ordenar alfabeticamente
            const sortedCats = [...parentCategories].sort((a, b) => a.name.localeCompare(b.name));

            sortedCats.forEach(cat => {
                const groupName = cat.name;
                if (groups[groupName]) {
                    orderedGroups[groupName] = groups[groupName];
                    delete groups[groupName];
                }
            });
        }

        // 3. Grupos restantes (Outros ou categorias não mapeadas / que sobraram)
        Object.keys(groups).sort().forEach(groupName => {
            orderedGroups[groupName] = groups[groupName];
        });

        return {
            productionList,
            groups: orderedGroups,
            totalItems: productionList.length
        };
    }, [orders, recipes, selectedDay, categories, categoryMap, categoryOrder]);

    return productionData;
}
