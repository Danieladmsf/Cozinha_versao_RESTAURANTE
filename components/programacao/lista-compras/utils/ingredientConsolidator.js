/**
 * Utilitário para consolidação de ingredientes de receitas
 * Processa todos os pedidos da semana e consolida os ingredientes por nome
 */

/**
 * Extrai ingredientes de uma receita com suas quantidades, de forma profunda (relacional).
 * @param {Object} recipe - Receita com dados de ingredientes
 * @param {number} quantityNeeded - Quantidade de receitas necessárias
 * @param {Array} allRecipes - Todas as receitas (necessário para resolver links cruzados origin_id)
 * @returns {Array} Array de ingredientes com quantidades calculadas
 */
const extractIngredientsFromRecipe = (recipe, quantityNeeded, allRecipes = []) => {
  const ingredientes = [];
  const visitedIds = new Set();

  const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(',', '.');
    return parseFloat(str) || 0;
  };

  const getIngredientUnitWeight = (ingredient) => {
    let unitW = parseNumber(ingredient.weight_thawed) ||
      parseNumber(ingredient.weight_clean) ||
      parseNumber(ingredient.weight_cooked) ||
      parseNumber(ingredient.weight_pre_cooking) || 0;

    if (!unitW && ingredient.weights) {
      unitW = parseNumber(ingredient.weights.thawed) ||
        parseNumber(ingredient.weights.clean) ||
        parseNumber(ingredient.weights.cooked) || 0;
    }
    return unitW;
  };

  // Process and push a leaf ingredient into the consolidated array
  const pushLeafIngredient = (ingredient, unitWeight, multiplierScale, sourceRecipeName) => {
    if (!unitWeight || !ingredient.name) return;

    const scaledUnitWeight = unitWeight * multiplierScale;
    const finalWeightNeeded = scaledUnitWeight * quantityNeeded;

    ingredientes.push({
      name: ingredient.name.trim(),
      category: ingredient.category || 'Outros',
      unit: ingredient.unit || 'kg',
      quantity: finalWeightNeeded,
      weight: finalWeightNeeded,
      recipe: sourceRecipeName || recipe.name,
      brand: ingredient.brand || '',
      notes: ingredient.notes || '',
      debug: {
        unitWeight,
        multiplierScale,
        scaledUnitWeight,
        quantityNeeded,
        finalWeightNeeded
      }
    });
  };

  /**
   * Recursive function to explode preparations and resolve origin_id.
   * "scaleFactor" represents the local multiplier to reach the clone's required yield size.
   */
  const explodePreparations = (preps, parentScaleFactor, contextRecipeName) => {
    if (!preps || !Array.isArray(preps)) return;

    preps.forEach((prep) => {
      // DYNAMIC INHERITANCE: If step came from a live base recipe, explode it instead!
      if (prep.origin_id && allRecipes.length > 0 && !visitedIds.has(prep.origin_id)) {
        const baseRecipe = allRecipes.find(r => r.id === prep.origin_id);
        if (baseRecipe && baseRecipe.preparations) {
          visitedIds.add(baseRecipe.id);

          // Calculate scale ratio between the clone and the live base recipe.
          // By dividing any matching ingredient's quantities, we get the exact proportional scale.
          let scaleRatio = 1;
          const firstCloneIng = prep.ingredients?.[0];
          if (firstCloneIng) {
            const cloneQ = parseNumber(firstCloneIng.quantity);
            let baseQ = 0;
            baseRecipe.preparations.forEach(bp => {
              const bMatch = bp.ingredients?.find(bi => bi.name === firstCloneIng.name);
              if (bMatch) baseQ = parseNumber(bMatch.quantity);
            });
            if (baseQ > 0 && cloneQ > 0) {
              scaleRatio = cloneQ / baseQ;
            }
          }

          // Recursively explode the LIVE Base Recipe inheriting the local scale ratio!
          explodePreparations(baseRecipe.preparations, parentScaleFactor * scaleRatio, baseRecipe.name);
          return; // Skip reading the dead clone!
        }
      }

      // NO origin_id OR base recipe not found: Extract from shallow clone directly
      if (prep.ingredients && Array.isArray(prep.ingredients)) {
        prep.ingredients.forEach(ingredient => {
          const unitW = getIngredientUnitWeight(ingredient);
          pushLeafIngredient(ingredient, unitW, parentScaleFactor, contextRecipeName);
        });
      }
    });
  };

  visitedIds.add(recipe.id);
  explodePreparations(recipe.preparations, 1, recipe.name);

  return ingredientes;
};

/**
 * Calcula quantas vezes cada receita precisa ser feita baseado nos pedidos
 * @param {Array} orders - Array de pedidos da semana
 * @param {Array} recipes - Array de receitas disponíveis
 * @returns {Object} Objeto com recipe_id como chave e quantidade de receitas necessárias
 */
const calculateRecipeQuantities = (orders, recipes) => {
  const recipeQuantities = {};


  orders.forEach((order, orderIndex) => {

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item, itemIndex) => {
        if (item.recipe_id && item.quantity) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {

            // Calcular quantas receitas completas são necessárias
            const portionSize = recipe.portion_weight_calculated || recipe.cuba_weight || 0.06; // peso por porção
            const recipeYield = recipe.yield_weight || 0.17; // rendimento total da receita
            const portionsPerRecipe = recipeYield / portionSize; // quantas porções uma receita produz

            const recipesNeeded = item.quantity / portionsPerRecipe;


            if (!recipeQuantities[item.recipe_id]) {
              recipeQuantities[item.recipe_id] = 0;
            }

            recipeQuantities[item.recipe_id] += recipesNeeded;

          } else {
          }
        }
      });
    }
  });

  return recipeQuantities;
};

/**
 * Consolida ingredientes duplicados somando suas quantidades
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
    } else {
      consolidated[key] = {
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        totalQuantity: ingredient.quantity,
        totalWeight: ingredient.weight,
        usedInRecipes: 1,
        recipes: [ingredient.recipe],
        brand: ingredient.brand,
        notes: ingredient.notes
      };
    }
  });

  return Object.values(consolidated);
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


    if (totalRecipesNeeded === 0) {
      return [];
    }

    // 2. Extrair todos os ingredientes de todas as receitas
    const allIngredients = [];

    Object.entries(recipeQuantities).forEach(([recipeId, quantity]) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && quantity > 0) {
        const ingredients = extractIngredientsFromRecipe(recipe, quantity, recipes);
        allIngredients.push(...ingredients);
      } else {
      }
    });


    if (allIngredients.length === 0) {
      return [];
    }

    // 3. Consolidar ingredientes duplicados
    const consolidatedIngredients = consolidateDuplicateIngredients(allIngredients);

    // 4. Ordenar alfabeticamente
    consolidatedIngredients.sort((a, b) => a.name.localeCompare(b.name));

    // 5. Log de debug final

    return consolidatedIngredients;

  } catch (error) {
    return [];
  }
};

/**
 * Função utilitária para formatar peso para exibição
 * @param {number} weightKg - Peso em quilogramas
 * @returns {string} Peso formatado
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
 * @param {number} quantity - Quantidade
 * @param {string} unit - Unidade
 * @returns {string} Quantidade formatada
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