/**
 * Utilitário CORRIGIDO para consolidação de ingredientes de receitas
 * Processa todos os pedidos da semana e consolida os ingredientes por nome
 *
 * CORREÇÕES IMPLEMENTADAS:
 * 1. Cálculo correto baseado no tipo de unidade (cuba-g, porção, unid., etc.)
 * 2. Extração mais robusta de peso dos ingredientes
 * 3. Uso correto da quantidade do ingrediente na receita
 */

/**
 * Extrai o peso mais adequado de um ingrediente PARA LISTA DE COMPRAS
 * LÓGICA: Usa o PESO INICIAL do PRIMEIRO PROCESSO (o que você compra no mercado)
 *
 * ⚠️ IMPORTANTE: Para lista de compras, precisamos do peso BRUTO (antes de qualquer processamento)!
 *
 * PRIORIDADE (primeiro input de cada processo):
 *   1. weight_frozen → Se receita começa com Descongelamento
 *   2. weight_raw → Se receita começa com Limpeza
 *   3. weight_pre_cooking → Se receita começa apenas com Cocção
 *   4. weight_thawed → Fim de Descongelamento (2º recurso)
 *   5. weight_clean → Fim de Limpeza (2º recurso)
 *   6. weight_cooked → Peso final cozido (último recurso)
 *
 * Exemplo: Coxão duro no Strogonoff (processo: Limpeza → Cocção)
 *   - weight_raw: 2,438 kg ← USADO (início de Limpeza)
 *   - weight_clean: 2,194 kg
 *   - weight_pre_cooking: 2,194 kg
 *   - weight_cooked: 1,951 kg
 */
const getIngredientWeight = (ingredient) => {
  // Helper para converter valores vazios/inválidos e lidar com formato brasileiro (vírgula)
  const parseWeight = (value) => {
    if (value === null || value === undefined || value === '') return 0;

    // Se for string, substituir vírgula por ponto (formato brasileiro → formato JS)
    if (typeof value === 'string') {
      value = value.replace(',', '.');
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 1. PRIORIDADE: Peso INICIAL do primeiro processo (o que você compra)
  // Ordem: Descongelamento > Limpeza > Cocção
  let weight = parseWeight(ingredient.weight_frozen);   // Início de Descongelamento
  if (!weight) weight = parseWeight(ingredient.weight_raw);      // Início de Limpeza
  if (!weight) weight = parseWeight(ingredient.raw_weight);
  if (!weight) weight = parseWeight(ingredient.weight);
  if (!weight) weight = parseWeight(ingredient.weight_pre_cooking); // Início de Cocção

  // 2. SEGUNDO RECURSO: Peso intermediário (após primeira etapa)
  if (!weight) weight = parseWeight(ingredient.weight_thawed);  // Fim de Descongelamento
  if (!weight) weight = parseWeight(ingredient.weight_clean);   // Fim de Limpeza

  // 3. Tentar objetos aninhados (mesma ordem)
  if (!weight && ingredient.weights) {
    weight = parseWeight(ingredient.weights.frozen);
    if (!weight) weight = parseWeight(ingredient.weights.raw);
    if (!weight) weight = parseWeight(ingredient.weights.pre_cooking);
    if (!weight) weight = parseWeight(ingredient.weights.thawed);
    if (!weight) weight = parseWeight(ingredient.weights.clean);
  }

  // 4. ÚLTIMO RECURSO: Peso final/cozido (menor peso, maior perda)
  if (!weight) weight = parseWeight(ingredient.weight_cooked);
  if (!weight && ingredient.weights) {
    weight = parseWeight(ingredient.weights.cooked);
  }

  return weight;
};

const extractIngredientsFromRecipe = (recipe, recipeMultiplier, allRecipes = [], depth = 0) => {
  const ingredients = [];

  // Guard to prevent infinite recursion
  if (depth > 5) return [];

  // Verificar estrutura de preparations
  if (!recipe.preparations || !Array.isArray(recipe.preparations)) {
    return ingredients;
  }

  recipe.preparations.forEach((preparation) => {
    // 1. Process Direct Ingredients
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach((ingredient) => {
        if (!ingredient.name) return;

        const unit = (ingredient.unit || '').toLowerCase().trim();
        const quantity = parseFloat(ingredient.quantity) || 0;
        let weight = getIngredientWeight(ingredient);

        // Fallback: If no weight found but unit implies mass/volume, use quantity
        if ((!weight || weight === 0) && quantity > 0) {
          if (['kg', 'l', 'litro', 'kilograma'].includes(unit)) {
            weight = quantity;
          } else if (['g', 'ml', 'grama'].includes(unit)) {
            weight = quantity / 1000;
          }
        }

        if (!weight || weight === 0) return;

        // Logic to determine Total Weight for this line item
        let lineTotalWeight = 0;
        const isMassUnit = ['kg', 'l', 'g', 'ml', 'litro', 'grama', 'mg'].includes(unit);

        if (isMassUnit) {
          lineTotalWeight = weight;
        } else {
          const mult = quantity === 0 ? 1 : quantity;
          lineTotalWeight = weight * mult;
        }

        const totalWeight = lineTotalWeight * recipeMultiplier;

        ingredients.push({
          name: ingredient.name.trim(),
          category: ingredient.category || 'Outros',
          unit: ingredient.unit || 'kg',
          quantity: totalWeight,
          weight: totalWeight,
          recipe: recipe.name,
          recipeCategory: recipe.category || 'Outros',
          brand: ingredient.brand || '',
          notes: ingredient.notes || '',
          debug: { baseQuantity: quantity, unitWeight: weight, recipeMultiplier, totalWeight }
        });
      });
    }

    // 2. Process Sub-Components (Recursive)
    const processSubItems = (items) => {
      if (!items || !Array.isArray(items)) return;

      items.forEach(sub => {
        if (sub.type === 'recipe' || sub.recipe_id) {
          let subRecipe = null;
          if (sub.recipe_id) subRecipe = allRecipes.find(r => r.id === sub.recipe_id);
          if (!subRecipe && sub.name) subRecipe = allRecipes.find(r => r.name === sub.name);
          if (!subRecipe && sub.name) subRecipe = allRecipes.find(r => r.name.toLowerCase() === sub.name.toLowerCase());

          if (subRecipe) {
            let subYield = parseFloat(subRecipe.yield_weight);
            if (!subYield || subYield === 0) {
              if (subRecipe.preparations && subRecipe.preparations.length > 0) {
                const last = subRecipe.preparations[subRecipe.preparations.length - 1];
                subYield = parseFloat(last.weight_portioned || last.weight_cooked || last.weight_clean || 0);
              }
            }
            if (!subYield || subYield === 0) subYield = 1000;

            const subYieldKg = subYield < 10 ? subYield : subYield / 1000;
            const usedWeight = parseFloat(sub.assembly_weight_kg || sub.weight_portioned || sub.used_weight || sub.quantity || 0);

            if (usedWeight > 0 && subYieldKg > 0) {
              const subMultiplier = (usedWeight / subYieldKg) * recipeMultiplier;
              const subIngredients = extractIngredientsFromRecipe(subRecipe, subMultiplier, allRecipes, depth + 1);
              ingredients.push(...subIngredients);
            }
          }
        }
      });
    };

    if (preparation.sub_components) processSubItems(preparation.sub_components);
    if (preparation.recipes) processSubItems(preparation.recipes);
  });

  return ingredients;
};

/**
 * Calcula quantas vezes cada receita precisa ser feita baseado nos pedidos
 * CORRIGIDO: Considera o tipo de unidade corretamente
 * @param {Array} orders - Array de pedidos da semana
 * @param {Array} recipes - Array de receitas disponíveis
 * @returns {Object} Objeto com recipe_id como chave e multiplicador de receitas
 */
const calculateRecipeQuantities = (orders, recipes) => {
  const recipeQuantities = {};

  orders.forEach((order, orderIndex) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        if (item.recipe_id && item.quantity) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (!recipe) {
            return;
          }

          // CORREÇÃO: Calcular baseado no tipo de unidade
          let recipeMultiplier = 0;
          const itemQuantity = parseFloat(item.quantity);
          const unitType = (item.unit_type || '').toLowerCase();

          if (unitType === 'cuba' || unitType === 'cuba-g' || unitType === 'cuba-p') {
            // Para cubas: a quantidade é o número de cubas
            // Se pede 2 cubas, multiplica a receita por 2
            recipeMultiplier = itemQuantity;

          } else if (unitType === 'unid.' || unitType === 'porção') {
            // Para unidades/porções: calcular quantas receitas são necessárias
            const portionWeight = recipe.portion_weight_calculated || 0.06; // peso de 1 porção
            const cubaWeight = recipe.cuba_weight || 1; // peso de 1 cuba
            const portionsPerCuba = cubaWeight / portionWeight;
            recipeMultiplier = itemQuantity / portionsPerCuba;

          } else if (unitType === 'kg') {
            // Para kg: calcular baseado no rendimento da receita
            const yieldWeight = recipe.yield_weight || recipe.cuba_weight || 1;
            recipeMultiplier = itemQuantity / yieldWeight;

          } else {
            // Fallback: assumir que é cuba
            recipeMultiplier = itemQuantity;
          }

          if (!recipeQuantities[item.recipe_id]) {
            recipeQuantities[item.recipe_id] = 0;
          }

          recipeQuantities[item.recipe_id] += recipeMultiplier;
        }
      });
    }
  });

  return recipeQuantities;
};

/**
 * Consolida ingredientes duplicados somando suas quantidades
 * ✅ ATUALIZADO: Agora agrupa por categoria de receita
 * @param {Array} allIngredients - Array de todos os ingredientes extraídos
 * @returns {Array} Array de ingredientes consolidados sem duplicatas
 */
const consolidateDuplicateIngredients = (allIngredients) => {
  const consolidated = {};

  allIngredients.forEach(ingredient => {
    const key = `${ingredient.name}_${ingredient.unit}`.toLowerCase();

    if (consolidated[key]) {
      // Somar quantidades e pesos
      consolidated[key].totalQuantity += ingredient.quantity;
      consolidated[key].totalWeight += ingredient.weight;
      consolidated[key].usedInRecipes += 1;

      // Combinar receitas onde é usado
      if (!consolidated[key].recipes.includes(ingredient.recipe)) {
        consolidated[key].recipes.push(ingredient.recipe);
      }

      // ✅ NOVO: Combinar categorias de receitas
      if (ingredient.recipeCategory && !consolidated[key].recipeCategories.includes(ingredient.recipeCategory)) {
        consolidated[key].recipeCategories.push(ingredient.recipeCategory);
      }
    } else {
      consolidated[key] = {
        name: ingredient.name,
        category: ingredient.category, // Categoria do ingrediente (mantida para compatibilidade)
        unit: ingredient.unit,
        totalQuantity: ingredient.quantity,
        totalWeight: ingredient.weight,
        usedInRecipes: 1,
        recipes: [ingredient.recipe],
        recipeCategories: [ingredient.recipeCategory || 'Outros'], // ✅ NOVO: Array com categorias das receitas
        brand: ingredient.brand,
        notes: ingredient.notes
      };
    }
  });

  const result = Object.values(consolidated);
  return result;
};

/**
 * ✅ NOVA: Extrai todos os ingredientes SEM consolidação (para agrupamento por categoria)
 * @param {Array} orders - Pedidos da semana
 * @param {Array} recipes - Receitas disponíveis
 * @returns {Array} Array de ingredientes NÃO consolidados com categoria de receita
 */
export const extractAllIngredientsWithoutConsolidation = (orders, recipes) => {
  try {
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const allIngredients = [];

    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        // Pass recipes for recursion
        const ingredients = extractIngredientsFromRecipe(recipe, quantity, recipes);
        allIngredients.push(...ingredients);
      }
    });

    return allIngredients;
  } catch (error) {
    console.error('Erro ao extrair ingredientes:', error);
    return [];
  }
};

/**
 * Função principal para consolidar ingredientes de todas as receitas da semana
 * @param {Array} orders - Pedidos da semana
 * @param {Array} recipes - Receitas disponíveis
 * @returns {Array} Array de ingredientes consolidados ordenado alfabeticamente
 */
export const consolidateIngredientsFromRecipes = (orders, recipes) => {
  try {
    // 1. Calcular quantidades necessárias de cada receita
    const recipeQuantities = calculateRecipeQuantities(orders, recipes);
    const totalRecipesNeeded = Object.keys(recipeQuantities).length;

    console.log('🔍 DEBUG consolidateIngredients:', {
      totalOrders: orders.length,
      totalRecipes: recipes.length,
      recipeQuantities,
      primeirasReceitas: recipes.slice(0, 3).map(r => ({
        id: r.id,
        nome: r.name,
        category: r.category,
        temCategory: !!r.category
      }))
    });

    if (totalRecipesNeeded === 0) {
      console.warn('⚠️ Nenhuma receita necessária');
      return [];
    }

    // 2. Extrair todos os ingredientes de todas as receitas
    const allIngredients = [];

    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        // Pass recipes for recursion
        const ingredients = extractIngredientsFromRecipe(recipe, quantity, recipes);
        allIngredients.push(...ingredients);
      }
    });

    if (allIngredients.length === 0) {
      return [];
    }

    // 3. Consolidar ingredientes duplicados
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);

    // 4. Ordenar alfabeticamente
    consolidatedIngredients.sort((a, b) => a.name.localeCompare(b.name));

    return consolidatedIngredients;

  } catch (error) {
    return [];
  }
};

/**
 * Função utilitária para formatar peso para exibição
 */
export const formatWeight = (weightKg) => {
  if (!weightKg || weightKg === 0) return "0g";

  if (weightKg >= 1) {
    return `${weightKg.toFixed(2)}kg`;
  } else {
    return `${Math.round(weightKg * 1000)}g`;
  }
};

/**
 * Função utilitária para formatar quantidade para exibição
 */
export const formatQuantity = (quantity, unit) => {
  if (!quantity || quantity === 0) return `0 ${unit}`;

  // Se for número inteiro, mostrar sem decimais
  if (Number.isInteger(quantity)) {
    return `${quantity} ${unit}`;
  }

  // Mostrar até 3 casas decimais, removendo zeros desnecessários
  return `${parseFloat(quantity.toFixed(3))} ${unit}`;
};
