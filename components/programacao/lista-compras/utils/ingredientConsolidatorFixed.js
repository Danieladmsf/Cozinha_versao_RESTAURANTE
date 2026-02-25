/**
 * Utilitário CORRIGIDO para consolidação de ingredientes de receitas
 * Processa todos os pedidos da semana e consolida os ingredientes por nome
 *
 * CORREÇÕES IMPLEMENTADAS:
 * 1. Cálculo correto baseado no tipo de unidade (cuba-g, porção, unid., etc.)
 * 2. Extração mais robusta de peso dos ingredientes
 * 3. Uso correto da quantidade do ingrediente na receita
 */

import { DemandCalculator } from '@/lib/production-engine/DemandCalculator';

/**
 * ✅ NOVA: Extrai todos os ingredientes SEM consolidação (para agrupamento por categoria)
 * Agora impulsionado pelo DemandCalculator blindado.
 * @param {Array} orders - Pedidos da semana
 * @param {Array} recipes - Receitas disponíveis
 * @returns {Array} Array de ingredientes NÃO consolidados com categoria de receita
 */
export const extractAllIngredientsWithoutConsolidation = (orders, recipes) => {
  try {
    const catMap = new Map();
    recipes.forEach(r => {
      if (r.category_id) catMap.set(r.category_id, { name: r.category || 'Outros' });
    });

    // Motor puro
    const leaves = DemandCalculator.explodeOrders(orders, recipes, catMap);

    return leaves.map(leaf => ({
      name: leaf.ingredient.name || 'Sem Nome',
      category: leaf.ingredient.category || 'Outros', // Categoria do PRÓPRIO ingrediente
      unit: leaf.ingredient.canonical_unit || 'un',
      quantity: leaf.scaledQty, // A quantidade processada
      weight: leaf.scaledQty,   // Para compatibilidade, usamos a mesma
      recipe: leaf.contextStr,
      recipeCategory: leaf.topLevelCategory || 'Outros',
      brand: leaf.ingredient.brand || '',
      notes: leaf.ingredient.notes || '',
    }));
  } catch (error) {
    console.error('Erro ao extrair ingredientes pelo DemandCalculator:', error);
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
    const allIngredients = extractAllIngredientsWithoutConsolidation(orders, recipes);
    if (!allIngredients || allIngredients.length === 0) return [];

    const consolidated = {};

    allIngredients.forEach(ing => {
      const key = `${ing.name}_${ing.unit}`.toLowerCase();

      if (consolidated[key]) {
        consolidated[key].totalQuantity += ing.quantity;
        consolidated[key].totalWeight += ing.weight;

        if (!consolidated[key].recipes.includes(ing.recipe)) {
          consolidated[key].recipes.push(ing.recipe);
        }
        consolidated[key].usedInRecipes = consolidated[key].recipes.length;

        if (ing.recipeCategory && !consolidated[key].recipeCategories.includes(ing.recipeCategory)) {
          consolidated[key].recipeCategories.push(ing.recipeCategory);
        }
      } else {
        consolidated[key] = {
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
          totalQuantity: ing.quantity,
          totalWeight: ing.weight,
          usedInRecipes: 1,
          recipes: [ing.recipe],
          recipeCategories: [ing.recipeCategory || 'Outros'],
          brand: ing.brand,
          notes: ing.notes
        };
      }
    });

    const result = Object.values(consolidated);
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;

  } catch (error) {
    console.error('Erro ao consolidar ingredientes pelo DemandCalculator: ', error);
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

  if (Number.isInteger(quantity)) {
    return `${quantity} ${unit}`;
  }

  return `${parseFloat(quantity.toFixed(3))} ${unit}`;
};
